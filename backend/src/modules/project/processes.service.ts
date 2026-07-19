import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import type { User } from '../users/entities/user.entity';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { CreateProcessDto } from './dto/create-process.dto';
import { UpsertCompletionReportDto } from './dto/upsert-completion-report.dto';
import { OrderItem } from './entities/order-item.entity';
import { ProcessCompletionReport } from './entities/process-completion-report.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ProcessStageLink } from './entities/process-stage-link.entity';
import { Process } from './entities/process.entity';
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { ProcessStageStatus } from './enums/process-stage-status.enum';
import { ProcessStatus } from './enums/process-status.enum';
import { OrdersService } from './orders.service';
import { ProjectsService } from './projects.service';

@Injectable()
export class ProcessesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Process) private readonly processes: Repository<Process>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(WorkflowTemplate)
    private readonly templates: Repository<WorkflowTemplate>,
    @InjectRepository(ProcessCompletionReport)
    private readonly reports: Repository<ProcessCompletionReport>,
    private readonly projects: ProjectsService,
    private readonly notifications: NotificationsService,
    private readonly ordersService: OrdersService,
  ) {}

  private async loadForAccess(id: string, user?: User): Promise<Process> {
    const process = await this.processes.findOne({ where: { id } });
    if (!process) throw new NotFoundException(`Process ${id} not found`);
    await this.assertProjectAccess(process.orderItem.order.projectId, user);
    return process;
  }

  /** The process's completion report (or null). */
  async getCompletionReport(
    id: string,
    user?: User,
  ): Promise<ProcessCompletionReport | null> {
    await this.loadForAccess(id, user);
    return this.reports.findOne({ where: { processId: id } });
  }

  /** Create/update the completion report — only when the process is completed. */
  async upsertCompletionReport(
    id: string,
    dto: UpsertCompletionReportDto,
    user?: User,
  ): Promise<ProcessCompletionReport> {
    const process = await this.loadForAccess(id, user);
    if (process.overallStatus !== ProcessStatus.Completed) {
      throw new BadRequestException(
        'The process must be completed to file a completion report',
      );
    }
    let report = await this.reports.findOne({ where: { processId: id } });
    if (!report) report = this.reports.create({ processId: id });
    report.summary = dto.summary;
    report.outcome = dto.outcome ?? null;
    report.reportedByUserId = user?.id ?? null;
    await this.reports.save(report);
    return this.reports.findOneOrFail({ where: { processId: id } });
  }

  async removeCompletionReport(id: string, user?: User): Promise<void> {
    await this.loadForAccess(id, user);
    const report = await this.reports.findOne({ where: { processId: id } });
    if (report) await this.reports.softRemove(report);
  }

  /** Non-admins must be a member of the process's project (404 otherwise). */
  private async assertProjectAccess(
    projectId: string,
    user?: User,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (!(await this.projects.isMember(projectId, user.id))) {
      throw new NotFoundException('Process not found');
    }
  }

  /**
   * Create a process for an order item. When a template is given, its stages are
   * COPIED into independent ProcessStages (no link to the template stages), so
   * later template edits never affect this item — and vice versa.
   */
  async create(dto: CreateProcessDto, user?: User): Promise<Process> {
    const orderItem = await this.orderItems.findOne({
      where: { id: dto.orderItemId },
    });
    if (!orderItem) {
      throw new NotFoundException(`Order item ${dto.orderItemId} not found`);
    }
    if (
      user &&
      !ProjectsService.isAdmin(user) &&
      !(await this.projects.isMember(orderItem.order.projectId, user.id))
    ) {
      throw new NotFoundException(`Order item ${dto.orderItemId} not found`);
    }

    let template: WorkflowTemplate | null = null;
    if (dto.templateId) {
      template = await this.templates.findOne({
        where: { id: dto.templateId },
        relations: { stages: true },
      });
      if (!template) {
        throw new NotFoundException(
          `Workflow template ${dto.templateId} not found`,
        );
      }
    }

    const requireEstimates = dto.requireEstimates ?? false;
    const templateStages = template
      ? [...(template.stages ?? [])].sort((a, b) => a.sequence - b.sequence)
      : [];

    if (requireEstimates) {
      if (
        !dto.estimatedStartDate ||
        !dto.estimatedCompletedDate ||
        dto.estimatedDurationHours == null
      ) {
        throw new BadRequestException(
          'Estimated start date, completed date and duration are required.',
        );
      }
      // Every cloned stage needs its own estimates (one per template stage).
      if (
        templateStages.length > 0 &&
        (dto.stageEstimates ?? []).length !== templateStages.length
      ) {
        throw new BadRequestException(
          'Estimates are required for every stage of the template.',
        );
      }
    }

    const processId = await this.dataSource.transaction(async (manager) => {
      const process = manager.create(Process, {
        orderItemId: orderItem.id,
        usedTemplateId: template?.id ?? null,
        overallStatus: ProcessStatus.Draft,
        requireEstimates,
        estimatedStartDate: requireEstimates
          ? (dto.estimatedStartDate ?? null)
          : null,
        estimatedCompletedDate: requireEstimates
          ? (dto.estimatedCompletedDate ?? null)
          : null,
        estimatedDurationHours: requireEstimates
          ? (dto.estimatedDurationHours ?? null)
          : null,
      });
      const savedProcess = await manager.save(process);

      const idMap = new Map<string, string>();
      for (let i = 0; i < templateStages.length; i += 1) {
        const ts = templateStages[i];
        const est = dto.stageEstimates?.[i];
        // Independent copy: snapshot name/input/output from the template stage.
        const stage = manager.create(ProcessStage, {
          processId: savedProcess.id,
          sequence: ts.sequence,
          name: ts.name ?? 'Stage',
          input: ts.input ?? null,
          output: ts.output ?? null,
          status: ProcessStageStatus.Pending,
          estimatedStartDate: est?.estimatedStartDate ?? null,
          estimatedCompletedDate: est?.estimatedCompletedDate ?? null,
          estimatedDurationHours: est?.estimatedDurationHours ?? null,
          // Carry the template's canvas layout over to the process view.
          posX: ts.posX ?? null,
          posY: ts.posY ?? null,
        });
        const savedStage = await manager.save(stage);
        idMap.set(ts.id, savedStage.id);
      }

      // Copy the template's DAG edges onto the cloned stages.
      for (const ts of templateStages) {
        for (const link of ts.incomingLinks ?? []) {
          const fromId = idMap.get(link.fromStageId);
          const toId = idMap.get(ts.id);
          if (!fromId || !toId) continue; // defensive: dangling source link
          await manager.save(
            manager.create(ProcessStageLink, {
              fromStageId: fromId,
              toStageId: toId,
              kind: link.kind,
            }),
          );
        }
      }

      return savedProcess.id;
    });

    // A new draft process can reopen a completed item/order (both derived).
    await this.ordersService.recomputeItemStatus(orderItem.id);
    await this.ordersService.recomputeStatus(orderItem.orderId);
    return this.findOneWithStages(processId);
  }

  async findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Process;
    order: 'ASC' | 'DESC';
    orderId?: string;
    orderItemId?: string;
    user?: User;
  }): Promise<[Process[], number]> {
    const where: FindOptionsWhere<Process> = {};
    // Filter/scope through the order item (→ order → project).
    const orderItemWhere: FindOptionsWhere<OrderItem> = {};
    if (options.orderItemId) orderItemWhere.id = options.orderItemId;
    if (options.orderId) orderItemWhere.orderId = options.orderId;
    // Non-admins only see processes of projects they are a member of.
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      const ids = await this.projects.memberProjectIds(options.user.id);
      orderItemWhere.order = { projectId: In(ids) };
    }
    if (Object.keys(orderItemWhere).length) where.orderItem = orderItemWhere;
    return this.processes.findAndCount({
      where,
      relations: { stages: true },
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order, stages: { sequence: 'ASC' } },
    });
  }

  async findOneWithStages(id: string, user?: User): Promise<Process> {
    const found = await this.processes.findOne({
      where: { id },
      relations: { stages: true },
      order: { stages: { sequence: 'ASC' } },
    });
    if (!found) throw new NotFoundException(`Process ${id} not found`);
    await this.assertProjectAccess(found.orderItem.order.projectId, user);
    return found;
  }

  async update(
    id: string,
    dto: { responsibleUserId?: string | null },
    user?: User,
  ): Promise<Process> {
    const found = await this.processes.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Process ${id} not found`);
    await this.assertProjectAccess(found.orderItem.order.projectId, user);
    if (dto.responsibleUserId !== undefined) {
      const changed = dto.responsibleUserId !== found.responsibleUserId;
      // Column-level update: avoids the eager relation re-writing the FK.
      await this.processes.update(id, {
        responsibleUserId: dto.responsibleUserId,
      });
      if (changed && dto.responsibleUserId) {
        const order = found.orderItem.order;
        await this.notifications.notifyUser(
          dto.responsibleUserId,
          {
            type: NotificationType.Assignment,
            title: 'Süreç ataması',
            message: `${order.orderNumber} — bir sürece sorumlu olarak atandınız.`,
            link: `/projects/${order.projectId}/orders/${found.orderItem.orderId}`,
            entityType: 'process',
            entityId: id,
          },
          user?.id,
        );
      }
    }
    return this.findOneWithStages(id);
  }

  async remove(id: string, user?: User): Promise<void> {
    const found = await this.processes.findOne({
      where: { id },
      relations: { stages: true },
    });
    if (!found) throw new NotFoundException(`Process ${id} not found`);
    await this.assertProjectAccess(found.orderItem.order.projectId, user);
    // Leaf-first: a process can only be deleted once it has no stages.
    if (found.stages?.length) {
      throw new ConflictException(
        'Bu proses silinemez: bağlı aşamalar var. Önce aşamaları silin.',
      );
    }
    await this.processes.softRemove(found);
    // Removing a process can complete (or reset) the derived statuses.
    await this.ordersService.recomputeItemStatus(found.orderItem.id);
    await this.ordersService.recomputeStatus(found.orderItem.orderId);
  }
}

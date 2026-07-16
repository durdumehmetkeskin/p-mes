import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order } from '../../project/entities/order.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { Process } from '../../project/entities/process.entity';
import { Project } from '../../project/entities/project.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { STAGE_STATUS_SEGMENTS } from '../report-theme';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

/**
 * Per-project production rollup: the full Project → Orders → Processes → Stages
 * chain with status, actual-vs-estimated durations and completion percentage,
 * plus chart-ready aggregates (status distribution + per-order completion).
 */
@Injectable()
export class ProjectProductionDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.ProjectProduction;
  readonly label = 'Project Production';
  readonly params: ReportParamField[] = [
    { name: 'projectId', label: 'Project', type: 'project', required: true },
  ];

  constructor(
    @InjectRepository(Project) private readonly projects: Repository<Project>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Process) private readonly processes: Repository<Process>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const projectId = String(params.projectId ?? '');
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }

    const project = await this.projects.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const orders = await this.orders.find({
      where: { projectId },
      order: { orderNumber: 'ASC' },
    });
    const orderIds = orders.map((o) => o.id);

    const processes = orderIds.length
      ? await this.processes.find({
          where: { orderItem: { orderId: In(orderIds) } },
          order: { createdAt: 'ASC' },
        })
      : [];
    const processIds = processes.map((p) => p.id);

    const stages = processIds.length
      ? await this.stages.find({
          where: { processId: In(processIds) },
          order: { sequence: 'ASC' },
        })
      : [];

    const stagesByProcess = new Map<string, ProcessStage[]>();
    for (const s of stages) {
      const list = stagesByProcess.get(s.processId) ?? [];
      list.push(s);
      stagesByProcess.set(s.processId, list);
    }
    const processesByOrder = new Map<string, Process[]>();
    for (const p of processes) {
      const list = processesByOrder.get(p.orderItem.orderId) ?? [];
      list.push(p);
      processesByOrder.set(p.orderItem.orderId, list);
    }

    let totalStages = 0;
    let completedStages = 0;
    let inProgressStages = 0;
    let pendingStages = 0;
    let totalDurationHours = 0;
    const orderCompletion: Array<{
      label: string;
      total: number;
      completed: number;
      value: number;
    }> = [];

    const orderViews = orders.map((order) => {
      let orderTotal = 0;
      let orderCompleted = 0;
      const orderProcesses = (processesByOrder.get(order.id) ?? []).map((p) => {
        const ps = stagesByProcess.get(p.id) ?? [];
        const stageViews = ps.map((s) => {
          totalStages += 1;
          orderTotal += 1;
          if (s.status === 'completed') {
            completedStages += 1;
            orderCompleted += 1;
          } else if (s.status === 'in_progress') {
            inProgressStages += 1;
          } else {
            pendingStages += 1;
          }
          totalDurationHours += Number(s.durationHours ?? 0);
          return {
            sequence: s.sequence,
            name: s.name,
            status: s.status,
            stageType: s.stageType?.name ?? null,
            responsible:
              (s.workers ?? []).map((w) => w.name).join(', ') || null,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            durationHours: s.durationHours,
            estimatedStartDate: s.estimatedStartDate,
            estimatedCompletedDate: s.estimatedCompletedDate,
            estimatedDurationHours: s.estimatedDurationHours,
            note: s.note,
          };
        });
        return {
          status: p.overallStatus,
          category: p.category?.name ?? null,
          responsible: p.responsibleUser?.name ?? null,
          startedAt: p.startedAt,
          completedAt: p.completedAt,
          durationHours: p.durationHours,
          estimatedStartDate: p.estimatedStartDate,
          estimatedCompletedDate: p.estimatedCompletedDate,
          estimatedDurationHours: p.estimatedDurationHours,
          stages: stageViews,
        };
      });
      if (orderTotal > 0) {
        orderCompletion.push({
          label: order.orderNumber,
          total: orderTotal,
          completed: orderCompleted,
          value: (orderCompleted / orderTotal) * 100,
        });
      }
      return {
        orderNumber: order.orderNumber,
        name: order.name,
        description: order.description,
        dueDate: order.dueDate,
        status: order.status,
        processes: orderProcesses,
      };
    });

    const completionPct = totalStages
      ? (completedStages / totalStages) * 100
      : 0;

    // Busiest orders first for the bar chart (cap to keep the page tidy).
    orderCompletion.sort((a, b) => b.total - a.total);

    return {
      generatedAt: new Date().toISOString(),
      // Human label used to build the generated file name.
      subject: `${project.code} ${project.name}`.trim(),
      project: {
        code: project.code,
        name: project.name,
        description: project.description,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        manager: project.managerUser?.name ?? null,
        customer: project.customerCompany?.name ?? null,
      },
      summary: {
        totalOrders: orders.length,
        totalProcesses: processes.length,
        totalStages,
        completedStages,
        inProgressStages,
        pendingStages,
        completionPct,
        totalDurationHours,
      },
      charts: {
        stageStatus: STAGE_STATUS_SEGMENTS(
          completedStages,
          inProgressStages,
          pendingStages,
        ),
        orderCompletion: orderCompletion.slice(0, 8),
      },
      orders: orderViews,
    };
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockItemsService } from '../inventory/stock-items.service';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';
import { StockItemStatus } from '../inventory/enums/stock-item-status.enum';
import { InventoryTransactionType } from '../inventory/enums/inventory-transaction-type.enum';
import { Tool } from '../tooling/entities/tool.entity';
import { StageToolReservation } from './entities/stage-tool-reservation.entity';
import { ToolReservationStatus } from './enums/tool-reservation-status.enum';
import { ToolReservationsService } from './tool-reservations.service';
import { dagErrorMessage, topoSort, validateDag } from './dag.util';
import { AddProcessStageDto } from './dto/add-process-stage.dto';
import { ReserveStageToolDto } from './dto/reserve-stage-tool.dto';
import { ReorderProcessStagesDto } from './dto/reorder-process-stages.dto';
import { SetProcessStageLinksDto } from './dto/set-process-stage-links.dto';
import { UpdateProcessStageDto } from './dto/update-process-stage.dto';
import { UpsertCompletionReportDto } from './dto/upsert-completion-report.dto';
import { User } from '../users/entities/user.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ProcessStageLink } from './entities/process-stage-link.entity';
import { StageCompletionReport } from './entities/stage-completion-report.entity';
import { Process } from './entities/process.entity';
import { ProcessStageStatus } from './enums/process-stage-status.enum';
import { ProcessStatus } from './enums/process-status.enum';
import { OrdersService } from './orders.service';
import { ProjectsService } from './projects.service';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';

@Injectable()
export class ProcessStagesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    @InjectRepository(Process)
    private readonly processes: Repository<Process>,
    @InjectRepository(StageCompletionReport)
    private readonly reports: Repository<StageCompletionReport>,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    @InjectRepository(InventoryTransaction)
    private readonly transactions: Repository<InventoryTransaction>,
    @InjectRepository(StageToolReservation)
    private readonly toolReservations: Repository<StageToolReservation>,
    @InjectRepository(ProcessStageLink)
    private readonly stageLinks: Repository<ProcessStageLink>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Tool)
    private readonly tools: Repository<Tool>,
    private readonly toolReservationsService: ToolReservationsService,
    private readonly stockItemsService: StockItemsService,
    private readonly projects: ProjectsService,
    private readonly notifications: NotificationsService,
    private readonly ordersService: OrdersService,
  ) {}

  /** Non-admins must be a member of the stage/process's project (404 else). */
  private async assertProcessAccess(
    processId: string,
    user?: User,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    const process = await this.processes.findOne({ where: { id: processId } });
    if (
      !process ||
      !(await this.projects.isMember(
        process.orderItem.order.projectId,
        user.id,
      ))
    ) {
      throw new NotFoundException('Process not found');
    }
  }

  private async assertStageAccess(stageId: string, user?: User): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    const stage = await this.stages.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    await this.assertProcessAccess(stage.processId, user);
  }

  /**
   * Structural stage editing (add/edit/connect/delete) is relationship-based,
   * not permission-key based: only the owning process's responsible user or an
   * admin may do it (same rule the stage DELETE endpoint always had).
   */
  private assertProcessEditor(
    process: Pick<Process, 'responsibleUserId'>,
    user?: User,
  ): void {
    if (ProjectsService.isAdmin(user)) return;
    if (!user || process.responsibleUserId !== user.id) {
      throw new ForbiddenException(
        'Bu işlemi yalnızca proses sorumlusu veya admin yapabilir.',
      );
    }
  }

  /** Does any of the user's roles carry the given permission key? */
  private static hasKey(user: User | undefined, key: string): boolean {
    return Boolean(
      user?.roles?.some((r) => (r.permissions ?? []).includes(key)),
    );
  }

  /**
   * Tool reservations for a stage may be managed by an admin, a holder of the
   * process-stages:reserve-tools key (legacy/custom roles), or the owning
   * PROCESS'S RESPONSIBLE — planning their own process needs no global key.
   */
  private async assertToolReservationEditor(
    stageId: string,
    user?: User,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (ProcessStagesService.hasKey(user, 'process-stages:reserve-tools')) {
      return;
    }
    const stage = await this.findStage(stageId);
    const process = await this.processes.findOne({
      where: { id: stage.processId },
    });
    if (process?.responsibleUserId !== user.id) {
      throw new ForbiddenException(
        'Araç rezervasyonunu yalnızca proses sorumlusu, yetkili rol veya admin yönetebilir.',
      );
    }
  }

  /**
   * Stock items reserved for this stage (the full reservation → handover
   * lifecycle: reserving/reserved/delivering/delivered), so the stage card can
   * show which materials are committed and where they are in the handover. Uses
   * a shallow relation set (the eager tree cartesian-explodes — see the
   * stock-items perf gotcha). Membership-gated like the stage's read endpoints.
   */
  async stockItemsForStage(stageId: string, user?: User): Promise<unknown[]> {
    await this.assertStageAccess(stageId, user);
    const items = await this.stockItems.find({
      where: {
        stageId,
        status: In([
          StockItemStatus.Reserving,
          StockItemStatus.Reserved,
          StockItemStatus.Delivering,
          StockItemStatus.Delivered,
          StockItemStatus.Returning,
        ]),
      },
      relations: {
        lot: { material: { materialUnit: true } },
        warehouse: true,
        rack: true,
        deliveredByUser: true,
        receivedByUser: true,
        returnedByUser: true,
      },
      loadEagerRelations: false,
      order: { createdAt: 'ASC' },
    });
    return items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      status: it.status,
      lot: it.lot ? { id: it.lot.id, lotNumber: it.lot.lotNumber } : null,
      material: it.lot?.material
        ? {
            id: it.lot.material.id,
            code: it.lot.material.code,
            name: it.lot.material.name,
            unit: it.lot.material.materialUnit?.name ?? null,
          }
        : null,
      warehouse: it.warehouse ? { code: it.warehouse.code } : null,
      rack: it.rack ? { code: it.rack.code } : null,
      deliveredBy: it.deliveredByUser?.name ?? null,
      deliveredAt: it.deliveredAt,
      receivedBy: it.receivedByUser?.name ?? null,
      receivedAt: it.receivedAt,
      returnedBy: it.returnedByUser?.name ?? null,
      returnedAt: it.returnedAt,
    }));
  }

  /**
   * How much of each material was actually **used** at this stage: the sum of
   * OUT movements attributed to the stage (leftover-return "used at stage" +
   * direct consumes of the stage's delivered stock). Survives the item leaving
   * the stage on return. Membership-gated like the stage's read endpoints.
   */
  async stageMaterialUsage(stageId: string, user?: User): Promise<unknown[]> {
    await this.assertStageAccess(stageId, user);
    const rows = await this.transactions
      .createQueryBuilder('tx')
      .innerJoin('tx.material', 'm')
      .leftJoin('m.materialUnit', 'mu')
      .select('m.id', 'materialId')
      .addSelect('m.code', 'code')
      .addSelect('m.name', 'name')
      .addSelect('mu.name', 'unit')
      .addSelect('SUM(tx.quantity)', 'used')
      .where('tx.stage_id = :stageId', { stageId })
      .andWhere('tx.type = :out', { out: InventoryTransactionType.Out })
      .groupBy('m.id')
      .addGroupBy('m.code')
      .addGroupBy('m.name')
      .addGroupBy('mu.name')
      .getRawMany<{
        materialId: string;
        code: string;
        name: string;
        unit: string | null;
        used: string;
      }>();
    return rows.map((r) => ({
      materialId: r.materialId,
      code: r.code,
      name: r.name,
      unit: r.unit,
      used: Number(r.used),
    }));
  }

  // --- tool reservations (tools earmarked for the stage) ---

  /** Tools reserved for this stage, each with its current availability. */
  async listToolReservations(stageId: string, user?: User): Promise<unknown[]> {
    await this.assertStageAccess(stageId, user);
    const rows = await this.toolReservations.find({
      where: { stageId },
      relations: {
        receivedByUser: true,
        deliveredByUser: true,
        returnedByUser: true,
      },
      order: { createdAt: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      toolId: r.toolId,
      note: r.note,
      status: r.status,
      reservedFrom: r.reservedFrom,
      reservedTo: r.reservedTo,
      received: r.status === ToolReservationStatus.Received,
      deliveredAt: r.deliveredAt,
      deliveredBy: r.deliveredByUser?.name ?? null,
      receivedAt: r.receivedAt,
      receivedBy: r.receivedByUser?.name ?? null,
      returnedAt: r.returnedAt,
      returnedBy: r.returnedByUser?.name ?? null,
      tool: r.tool
        ? {
            id: r.tool.id,
            code: r.tool.code,
            name: r.tool.name,
            status: r.tool.status,
          }
        : null,
    }));
  }

  /** Reserve a tool for this stage (earmark it; not delivered yet). */
  /**
   * A stage's booking window for tool-reservation overlap checks: actuals when
   * known, planned otherwise; null bound = open-ended (conservative — a stage
   * without dates conflicts with everything, so double-booking is impossible).
   */
  private static stageWindow(
    stage: Pick<
      ProcessStage,
      'startedAt' | 'completedAt' | 'estimatedStartDate' | 'estimatedCompletedDate'
    >,
  ): { start: string | null; end: string | null } {
    const day = (d: Date | null) =>
      d ? new Date(d).toISOString().slice(0, 10) : null;
    return {
      start: day(stage.startedAt) ?? stage.estimatedStartDate ?? null,
      end: day(stage.completedAt) ?? stage.estimatedCompletedDate ?? null,
    };
  }

  /**
   * A reservation's effective datetime range (epoch ms; wall-clock semantics):
   * its own reservedFrom/To when set, else the stage's full-day window,
   * missing bounds unbounded (conservative — always conflicts).
   */
  private static reservationRange(res: {
    reservedFrom: Date | null;
    reservedTo: Date | null;
    stage: ProcessStage | null;
  }): { from: number; to: number } {
    if (res.reservedFrom && res.reservedTo) {
      return {
        from: new Date(res.reservedFrom).getTime(),
        to: new Date(res.reservedTo).getTime(),
      };
    }
    const window = res.stage
      ? ProcessStagesService.stageWindow(res.stage)
      : { start: null, end: null };
    return {
      from: window.start
        ? Date.parse(`${window.start}T00:00:00.000Z`)
        : Number.NEGATIVE_INFINITY,
      to: window.end
        ? Date.parse(`${window.end}T23:59:59.999Z`)
        : Number.POSITIVE_INFINITY,
    };
  }

  /** Wall-clock display: never toLocaleString (it would shift the hours). */
  private static fmtRange(from: number, to: number): string {
    const f = (ms: number) =>
      Number.isFinite(ms)
        ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
        : '…';
    return `${f(from)} → ${f(to)}`;
  }

  async reserveTool(
    stageId: string,
    dto: ReserveStageToolDto,
    user?: User,
  ): Promise<unknown[]> {
    await this.assertStageAccess(stageId, user);
    await this.assertToolReservationEditor(stageId, user);
    const stage = await this.findStage(stageId);
    const tool = await this.tools.findOne({ where: { id: dto.toolId } });
    if (!tool) throw new NotFoundException(`Tool ${dto.toolId} not found`);
    // A stage may hold several DISJOINT ranges of the same tool (one row per
    // range) — no duplicate guard; the overlap check below covers clashes.

    const { from, to } = await this.validateToolReservationRange(
      stage,
      dto.toolId,
      dto.reservedFrom,
      dto.reservedTo,
    );

    await this.toolReservations.save(
      this.toolReservations.create({
        stageId,
        toolId: dto.toolId,
        note: dto.note ?? null,
        reservedFrom: new Date(from),
        reservedTo: new Date(to),
      }),
    );
    return this.listToolReservations(stageId, user);
  }

  /**
   * Shared reserve/re-date validation: stage window required, range inside
   * it, no overlap with the tool's other non-returned reservations (their own
   * range, else their stage window; touching endpoints allowed).
   */
  private async validateToolReservationRange(
    stage: ProcessStage,
    toolId: string,
    reservedFrom?: string,
    reservedTo?: string,
    excludeReservationId?: string,
  ): Promise<{ from: number; to: number }> {
    // Reservations exist only INSIDE the stage's date window.
    const window = ProcessStagesService.stageWindow(stage);
    if (!window.start || !window.end) {
      throw new BadRequestException('Önce aşama tarihlerini tanımlayın.');
    }
    if (Boolean(reservedFrom) !== Boolean(reservedTo)) {
      throw new BadRequestException(
        'reservedFrom and reservedTo must be given together',
      );
    }
    // Default = the stage's whole window (mobile/legacy clients).
    const fromIso = reservedFrom ?? `${window.start}T00:00:00.000Z`;
    const toIso = reservedTo ?? `${window.end}T23:59:59.999Z`;
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      throw new BadRequestException('Geçersiz rezervasyon aralığı.');
    }
    const fromDay = new Date(from).toISOString().slice(0, 10);
    const toDay = new Date(to).toISOString().slice(0, 10);
    if (fromDay < window.start || toDay > window.end) {
      throw new BadRequestException(
        `Rezervasyon aşamanın tarih aralığında olmalı (${window.start} → ${window.end}).`,
      );
    }

    // No second reservation of the same tool in an overlapping range — own
    // stage's OTHER ranges included (each row is a disjoint range now).
    // Returned reservations (tool back in the crib) don't block; released
    // ones are soft-removed and never load here. Touching endpoints are OK.
    const others = await this.toolReservations.find({
      where: { toolId },
      relations: { stage: true },
    });
    for (const other of others) {
      if (!other.stage) continue;
      if (other.id === excludeReservationId) continue;
      if (other.status === ToolReservationStatus.Returned) continue;
      const range = ProcessStagesService.reservationRange(other);
      if (from < range.to && range.from < to) {
        throw new BadRequestException(
          `Bu araç "${other.stage.name}" aşaması için rezerve (${ProcessStagesService.fmtRange(range.from, range.to)}) — çakışan aralıkta ikinci rezervasyon yapılamaz.`,
        );
      }
    }
    return { from, to };
  }

  /**
   * Re-date an existing tool reservation (parity with section reservations).
   * Only while still `reserved` — a delivered/received tool is physically out.
   */
  async updateToolReservation(
    stageId: string,
    reservationId: string,
    dto: { reservedFrom: string; reservedTo: string },
    user?: User,
  ): Promise<unknown[]> {
    await this.assertStageAccess(stageId, user);
    await this.assertToolReservationEditor(stageId, user);
    const stage = await this.findStage(stageId);
    const res = await this.toolReservations.findOne({
      where: { id: reservationId, stageId },
    });
    if (!res) throw new NotFoundException('Tool reservation not found');
    if (res.status !== ToolReservationStatus.Reserved) {
      throw new BadRequestException(
        'Only a still-reserved tool reservation can be re-dated',
      );
    }
    const { from, to } = await this.validateToolReservationRange(
      stage,
      res.toolId,
      dto.reservedFrom,
      dto.reservedTo,
      res.id,
    );
    res.reservedFrom = new Date(from);
    res.reservedTo = new Date(to);
    await this.toolReservations.save(res);
    return this.listToolReservations(stageId, user);
  }

  /**
   * Set/replace the stage's work directives. Written only by the process's
   * responsible user or an admin (stages no longer have a responsible of
   * their own); workers and other project members read them with the stage
   * payload.
   */
  async updateDirectives(
    stageId: string,
    directives: string | null | undefined,
    user?: User,
  ): Promise<ProcessStage> {
    await this.assertStageAccess(stageId, user);
    const stage = await this.findStage(stageId);
    const owningProcess = await this.processes.findOne({
      where: { id: stage.processId },
    });
    if (
      !ProjectsService.isAdmin(user) &&
      (!user || owningProcess?.responsibleUserId !== user.id)
    ) {
      throw new ForbiddenException(
        'Direktifleri yalnızca proses sorumlusu veya admin düzenleyebilir.',
      );
    }
    const trimmed = directives?.trim();
    stage.directives = trimmed ? trimmed : null;
    return this.stages.save(stage);
  }

  /** Remove a tool reservation (planning-time); frees the tool if it was held. */
  async removeToolReservation(
    stageId: string,
    reservationId: string,
    user?: User,
  ): Promise<void> {
    await this.assertStageAccess(stageId, user);
    await this.assertToolReservationEditor(stageId, user);
    const res = await this.toolReservations.findOne({
      where: { id: reservationId, stageId },
    });
    if (!res) throw new NotFoundException('Tool reservation not found');
    await this.toolReservationsService.releaseReservation(res, user);
    await this.toolReservations.softRemove(res);
  }

  // --- completion report (filed once the stage is completed) ---

  /** The stage's completion report (or null). */
  async getCompletionReport(
    stageId: string,
    user?: User,
  ): Promise<StageCompletionReport | null> {
    await this.assertStageAccess(stageId, user);
    return this.reports.findOne({ where: { stageId } });
  }

  /** Create/update the completion report — only when the stage is completed. */
  async upsertCompletionReport(
    stageId: string,
    dto: UpsertCompletionReportDto,
    user?: User,
  ): Promise<StageCompletionReport> {
    await this.assertStageAccess(stageId, user);
    const stage = await this.stages.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException(`Stage ${stageId} not found`);
    if (stage.status !== ProcessStageStatus.Completed) {
      throw new BadRequestException(
        'The stage must be completed to file a completion report',
      );
    }
    let report = await this.reports.findOne({ where: { stageId } });
    if (!report) report = this.reports.create({ stageId });
    report.summary = dto.summary;
    report.outcome = dto.outcome ?? null;
    report.reportedByUserId = user?.id ?? null;
    await this.reports.save(report);
    return this.reports.findOneOrFail({ where: { stageId } });
  }

  async removeCompletionReport(stageId: string, user?: User): Promise<void> {
    await this.assertStageAccess(stageId, user);
    const report = await this.reports.findOne({ where: { stageId } });
    if (report) await this.reports.softRemove(report);
  }

  // --- stage list management (order-specific; never touches the template) ---

  async addStage(
    processId: string,
    dto: AddProcessStageDto,
    user?: User,
  ): Promise<ProcessStage> {
    await this.assertProcessAccess(processId, user);
    const process = await this.processes.findOne({ where: { id: processId } });
    if (!process) throw new NotFoundException(`Process ${processId} not found`);
    this.assertProcessEditor(process, user);
    // Structure is frozen while the process runs: no adding stages (editing
    // existing ones stays allowed). Completed processes may still gain a
    // stage — that deliberately reopens them (see recomputeOverall below).
    if (process.overallStatus === ProcessStatus.InProgress) {
      throw new BadRequestException(
        'Devam eden prosese aşama eklenemez. Aşamalar yalnızca düzenlenebilir.',
      );
    }
    // Estimate gating: processes requiring estimates need them on every stage.
    if (
      process.requireEstimates &&
      (!dto.estimatedStartDate ||
        !dto.estimatedCompletedDate ||
        dto.estimatedDurationHours == null)
    ) {
      throw new BadRequestException(
        'This process requires estimated start date, completed date and duration for each stage.',
      );
    }
    const max = await this.stages.maximum('sequence', { processId });
    const stage = this.stages.create({
      processId,
      sequence: (max ?? 0) + 1,
      name: dto.name,
      input: dto.input ?? null,
      output: dto.output ?? null,
      durationHours: dto.durationHours ?? null,
      estimatedStartDate: dto.estimatedStartDate ?? null,
      estimatedCompletedDate: dto.estimatedCompletedDate ?? null,
      estimatedDurationHours: dto.estimatedDurationHours ?? null,
      status: ProcessStageStatus.Pending,
    });
    const saved = await this.stages.save(stage);
    // Adding a pending stage to a completed process reopens it (in_progress,
    // completedAt cleared); re-completing all stages will set it back.
    await this.recomputeOverall(processId);
    await this.recomputeDuration(processId);
    return saved;
  }

  async updateStage(
    id: string,
    dto: UpdateProcessStageDto,
    user?: User,
  ): Promise<ProcessStage> {
    await this.assertStageAccess(id, user);
    const stage = await this.findStage(id);
    const owningProcess = await this.processes.findOne({
      where: { id: stage.processId },
    });
    if (owningProcess) this.assertProcessEditor(owningProcess, user);
    const prevWorkerIds = (stage.workers ?? []).map((w) => w.id);
    if (dto.name !== undefined) stage.name = dto.name;
    if (dto.input !== undefined) stage.input = dto.input;
    if (dto.output !== undefined) stage.output = dto.output;
    if (dto.note !== undefined) stage.note = dto.note;
    if (dto.durationHours !== undefined) {
      stage.durationHours = dto.durationHours;
    }
    if (dto.estimatedStartDate !== undefined) {
      stage.estimatedStartDate = dto.estimatedStartDate;
    }
    if (dto.estimatedCompletedDate !== undefined) {
      stage.estimatedCompletedDate = dto.estimatedCompletedDate;
    }
    if (dto.estimatedDurationHours !== undefined) {
      stage.estimatedDurationHours = dto.estimatedDurationHours;
    }
    if (dto.posX !== undefined) stage.posX = dto.posX;
    if (dto.posY !== undefined) stage.posY = dto.posY;
    // Saving with the untouched eager `workers` array is a junction no-op;
    // the worker set is diffed explicitly below.
    const saved = await this.stages.save(stage);

    if (dto.workerIds !== undefined) {
      const nextIds = [...new Set(dto.workerIds)];
      const toAdd = nextIds.filter((wid) => !prevWorkerIds.includes(wid));
      const toRemove = prevWorkerIds.filter((wid) => !nextIds.includes(wid));
      if (toAdd.length > 0) {
        // Fail cleanly on a bogus id instead of an FK-violation 500.
        const found = await this.users.count({ where: { id: In(toAdd) } });
        if (found !== toAdd.length) {
          throw new NotFoundException('One or more workers were not found');
        }
      }
      if (toAdd.length > 0 || toRemove.length > 0) {
        await this.stages
          .createQueryBuilder()
          .relation(ProcessStage, 'workers')
          .of(id)
          .addAndRemove(toAdd, toRemove);
        for (const wid of toAdd) {
          await this.notifications.notifyUser(
            wid,
            {
              type: NotificationType.Assignment,
              title: 'Aşama ataması',
              message: `"${stage.name}" aşamasına çalışan olarak atandınız.`,
              link: '/board',
              entityType: 'process-stage',
              entityId: id,
            },
            user?.id,
          );
        }
      }
    }

    // Keep the process duration in sync with the sum of its stages.
    await this.recomputeDuration(stage.processId);
    // Return the fresh entity when the worker set changed so the payload
    // carries the updated eager `workers` list.
    return dto.workerIds !== undefined ? this.findStage(id) : saved;
  }

  async removeStage(id: string, user?: User): Promise<void> {
    await this.assertStageAccess(id, user); // 404 for non-members
    const stage = await this.findStage(id);
    // Only the owning process's responsible user (or an admin) may delete a
    // stage — nobody else, regardless of permissions.
    const process = await this.processes.findOne({
      where: { id: stage.processId },
    });
    if (
      !ProjectsService.isAdmin(user) &&
      (!process || process.responsibleUserId !== user?.id)
    ) {
      throw new ForbiddenException(
        'Bu aşamayı yalnızca proses sorumlusu veya admin silebilir.',
      );
    }
    // Structure is frozen while the process runs: no deleting stages
    // (editing existing ones stays allowed).
    if (process?.overallStatus === ProcessStatus.InProgress) {
      throw new BadRequestException(
        'Devam eden prosesten aşama silinemez. Aşamalar yalnızca düzenlenebilir.',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      // Return reserved materials + tools to available before the purge, so a
      // hard delete (SET NULL on stock_items.stage_id) never orphans them.
      await this.stockItemsService.releaseAllForStage(id, manager);
      const reservations = await manager.find(StageToolReservation, {
        where: { stageId: id },
        relations: { tool: true },
      });
      for (const res of reservations) {
        await this.toolReservationsService.releaseReservation(res, user);
      }
      // Hard delete: detail lines, tool reservations AND dependency links
      // cascade via FK (successors of the deleted node become roots).
      await manager.delete(ProcessStage, { id });
      await this.recomputeSequences(manager, stage.processId);
    });
    await this.recomputeOverall(stage.processId);
    await this.recomputeDuration(stage.processId);
  }

  async reorder(
    processId: string,
    dto: ReorderProcessStagesDto,
    user?: User,
  ): Promise<ProcessStage[]> {
    await this.assertProcessAccess(processId, user);
    const process = await this.processes.findOne({ where: { id: processId } });
    if (!process) throw new NotFoundException(`Process ${processId} not found`);
    this.assertProcessEditor(process, user);
    // Stage order is locked once the process has started.
    if (process.overallStatus !== ProcessStatus.Draft) {
      throw new BadRequestException(
        'Stage order cannot be changed after the process has started.',
      );
    }
    const stages = await this.stages.find({ where: { processId } });
    const ids = new Set(stages.map((s) => s.id));
    if (
      dto.stageIds.length !== stages.length ||
      !dto.stageIds.every((id) => ids.has(id))
    ) {
      throw new BadRequestException(
        'stageIds must contain exactly the process stages',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < dto.stageIds.length; i += 1) {
        await manager.update(ProcessStage, dto.stageIds[i], {
          sequence: i + 1,
        });
      }
      // Reorder means "this is the linear execution order" — replace whatever
      // edges exist (BOTH kinds, io included) with a plain sequence chain so
      // sequence and DAG gating can never disagree. (No UI calls this; kept
      // for API compatibility.)
      const stageIds = dto.stageIds;
      await manager
        .createQueryBuilder()
        .delete()
        .from(ProcessStageLink)
        .where('to_stage_id IN (:...ids) OR from_stage_id IN (:...ids)', {
          ids: stageIds,
        })
        .execute();
      for (let i = 0; i < stageIds.length - 1; i += 1) {
        await manager.save(
          manager.create(ProcessStageLink, {
            fromStageId: stageIds[i],
            toStageId: stageIds[i + 1],
          }),
        );
      }
    });
    return this.stages.find({
      where: { processId },
      order: { sequence: 'ASC' },
    });
  }

  /**
   * Replace the process's whole dependency edge set (DAG). Draft only, same
   * permission as reorder. Recomputes `sequence` as the topological display
   * order and returns the fresh stage list.
   */
  async setLinks(
    processId: string,
    dto: SetProcessStageLinksDto,
    user?: User,
  ): Promise<ProcessStage[]> {
    await this.assertProcessAccess(processId, user);
    const process = await this.processes.findOne({ where: { id: processId } });
    if (!process) throw new NotFoundException(`Process ${processId} not found`);
    this.assertProcessEditor(process, user);
    if (process.overallStatus !== ProcessStatus.Draft) {
      throw new BadRequestException(
        'Stage connections can only be changed while the process is a draft.',
      );
    }
    const stages = await this.stages.find({ where: { processId } });
    const stageIds = stages.map((s) => s.id);
    const idSet = new Set(stageIds);
    for (const l of dto.links) {
      if (!idSet.has(l.fromStageId) || !idSet.has(l.toStageId)) {
        throw new BadRequestException(
          'Every link must connect two stages of this process.',
        );
      }
    }
    const error = validateDag(
      stageIds,
      dto.links.map((l) => ({
        from: l.fromStageId,
        to: l.toStageId,
        kind: l.kind ?? 'sequence',
      })),
    );
    if (error) throw new BadRequestException(dagErrorMessage(error));

    await this.dataSource.transaction(async (manager) => {
      if (stageIds.length > 0) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(ProcessStageLink)
          .where('to_stage_id IN (:...ids) OR from_stage_id IN (:...ids)', {
            ids: stageIds,
          })
          .execute();
      }
      for (const l of dto.links) {
        await manager.save(
          manager.create(ProcessStageLink, {
            fromStageId: l.fromStageId,
            toStageId: l.toStageId,
            kind: l.kind ?? 'sequence',
          }),
        );
      }
      await this.recomputeSequences(manager, processId);
    });
    return this.stages.find({
      where: { processId },
      order: { sequence: 'ASC' },
    });
  }

  /**
   * Rewrite `sequence` as a deterministic topological display order (Kahn;
   * ties broken by the old sequence, then name) — display-only consumers
   * (board, gantt, reports) keep a sensible order for parallel branches.
   */
  private async recomputeSequences(
    manager: EntityManager,
    processId: string,
  ): Promise<void> {
    const remaining = await manager.find(ProcessStage, {
      where: { processId },
      loadEagerRelations: false,
    });
    if (remaining.length === 0) return;
    const links = await manager.find(ProcessStageLink, {
      where: { toStageId: In(remaining.map((s) => s.id)) },
    });
    const byId = new Map(remaining.map((s) => [s.id, s]));
    const order = topoSort(
      remaining.map((s) => s.id),
      links.map((l) => ({ from: l.fromStageId, to: l.toStageId })),
      (a, b) =>
        (byId.get(a)!.sequence - byId.get(b)!.sequence) ||
        byId.get(a)!.name.localeCompare(byId.get(b)!.name),
    );
    // Cycles cannot exist here (validated on write), but stay defensive.
    const finalOrder = order ?? remaining.map((s) => s.id);
    for (let i = 0; i < finalOrder.length; i += 1) {
      const s = byId.get(finalOrder[i])!;
      if (s.sequence !== i + 1) {
        s.sequence = i + 1;
        await manager.save(s);
      }
    }
  }

  // --- DAG status gating: a stage opens only after all its prerequisite
  // (incoming-link) stages complete; stages on independent branches run in
  // parallel, and a stage with no incoming links is immediately startable ---

  async updateStatus(
    id: string,
    status: ProcessStageStatus,
    user?: User,
    durationHours?: number,
  ): Promise<ProcessStage> {
    await this.assertStageAccess(id, user);
    const stage = await this.findStage(id);

    // Completing REQUIRES a manually entered duration — sent with this call
    // or already stored on the stage from an earlier edit.
    if (
      status === ProcessStageStatus.Completed &&
      durationHours == null &&
      stage.durationHours == null
    ) {
      throw new BadRequestException(
        'Aşama tamamlanmadan önce çalışma süresi (saat) girilmelidir.',
      );
    }

    // Relationship-based authorization (no permission key): admin or the
    // owning process's responsible may make ANY transition; a stage worker
    // may only START (pending→in_progress) or COMPLETE
    // (in_progress→completed) a stage they work on. Everyone else: 403
    // (non-members already got 404 above).
    if (!ProjectsService.isAdmin(user)) {
      const owningProcess = await this.processes.findOne({
        where: { id: stage.processId },
      });
      const isResponsible =
        !!user && owningProcess?.responsibleUserId === user.id;
      if (!isResponsible) {
        const isWorker =
          !!user && (stage.workers ?? []).some((w) => w.id === user.id);
        const workerAllowed =
          isWorker &&
          ((stage.status === ProcessStageStatus.Pending &&
            status === ProcessStageStatus.InProgress) ||
            (stage.status === ProcessStageStatus.InProgress &&
              status === ProcessStageStatus.Completed));
        if (!workerAllowed) {
          throw new ForbiddenException(
            'Bu durum değişikliğini yalnızca proses sorumlusu veya admin yapabilir; aşama çalışanı yalnızca çalıştığı aşamayı başlatabilir veya tamamlayabilir.',
          );
        }
      }
    }

    if (
      status === ProcessStageStatus.InProgress ||
      status === ProcessStageStatus.Completed
    ) {
      const incoming = await this.stageLinks.find({ where: { toStageId: id } });
      const predecessors = incoming.length
        ? await this.stages.find({
            where: { id: In(incoming.map((l) => l.fromStageId)) },
          })
        : [];
      if (
        !predecessors.every((p) => p.status === ProcessStageStatus.Completed)
      ) {
        throw new BadRequestException(
          'All prerequisite stages must be completed before this stage can start',
        );
      }
    }

    // Cannot start until all materials reserved for this stage are received
    // (i.e. none still reserving / reserved / delivering).
    if (status === ProcessStageStatus.InProgress) {
      const pending = await this.stockItems.count({
        where: {
          stageId: id,
          status: In([
            StockItemStatus.Reserving,
            StockItemStatus.Reserved,
            StockItemStatus.Delivering,
          ]),
        },
      });
      if (pending > 0) {
        throw new BadRequestException(
          'Bu aşama başlatılamaz: ayrılan malzemeler henüz teslim alınmadı',
        );
      }

      // Cannot start until every tool reserved for this stage has been received
      // (handed over to the stage responsible via the QR handover).
      await this.toolReservationsService.assertAllReceived(id);
    }

    const now = new Date();
    stage.status = status;
    if (status === ProcessStageStatus.Completed) {
      // Completing implies it has run — keep/seed startedAt so a duration exists.
      stage.startedAt = stage.startedAt ?? now;
      stage.completedAt = now;
      // The manually entered work duration arrives with the completion.
      if (durationHours != null) stage.durationHours = durationHours;
    } else if (status === ProcessStageStatus.InProgress) {
      stage.startedAt = stage.startedAt ?? now;
      stage.completedAt = null;
    } else {
      // Reset to pending — the stage's timers are cleared.
      stage.startedAt = null;
      stage.completedAt = null;
    }
    const saved = await this.stages.save(stage);

    // Tool usage sessions track the stage's runtime: start on begin, end on
    // complete/reset. (Tool status is driven by the explicit QR handover.)
    if (status === ProcessStageStatus.InProgress) {
      await this.toolReservationsService.onStageStart(id, user);
    } else {
      await this.toolReservationsService.onStageEnd(id);
    }

    await this.recomputeOverall(stage.processId);
    // A duration entered at completion changes the process total.
    if (durationHours != null) await this.recomputeDuration(stage.processId);
    return saved;
  }

  private async recomputeOverall(processId: string): Promise<void> {
    const process = await this.processes.findOne({ where: { id: processId } });
    if (!process) return;
    const all = await this.stages.find({ where: { processId } });
    const now = new Date();

    if (
      all.length > 0 &&
      all.every((s) => s.status === ProcessStageStatus.Completed)
    ) {
      process.overallStatus = ProcessStatus.Completed;
      process.startedAt = process.startedAt ?? now;
      process.completedAt = process.completedAt ?? now;
    } else if (all.some((s) => s.status !== ProcessStageStatus.Pending)) {
      // First stage started → process is in progress; its timer starts here.
      process.overallStatus = ProcessStatus.InProgress;
      process.startedAt = process.startedAt ?? now;
      process.completedAt = null;
    } else {
      process.overallStatus = ProcessStatus.Draft;
      process.startedAt = null;
      process.completedAt = null;
    }
    await this.processes.save(process);
    // Bubble up: the item's and the order's statuses follow the processes.
    if (process.orderItem?.id) {
      await this.ordersService.recomputeItemStatus(process.orderItem.id);
    }
    if (process.orderItem?.orderId) {
      await this.ordersService.recomputeStatus(process.orderItem.orderId);
    }
  }

  /** Process duration = sum of the manually entered stage durations (hours). */
  private async recomputeDuration(processId: string): Promise<void> {
    const all = await this.stages.find({ where: { processId } });
    const total = all.reduce((sum, s) => sum + (s.durationHours ?? 0), 0);
    await this.processes.update(processId, { durationHours: total });
  }

  private async findStage(id: string): Promise<ProcessStage> {
    const stage = await this.stages.findOne({ where: { id } });
    if (!stage) throw new NotFoundException(`Process stage ${id} not found`);
    return stage;
  }

  /** All stages under an order (via its items' processes) — for the reserve picker. */
  async findByOrder(orderId: string, user?: User): Promise<ProcessStage[]> {
    // Non-admins must be a member of the order's project (else 404, no leak).
    if (
      user &&
      !ProjectsService.isAdmin(user) &&
      !(await this.projects.memberOfOrderProject(orderId, user.id))
    ) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return this.stages
      .createQueryBuilder('s')
      .innerJoin('s.process', 'p')
      .innerJoin('p.orderItem', 'oi')
      .innerJoin('oi.order', 'o')
      .where('o.id = :orderId', { orderId })
      .orderBy('s.sequence', 'ASC')
      .getMany();
  }
}

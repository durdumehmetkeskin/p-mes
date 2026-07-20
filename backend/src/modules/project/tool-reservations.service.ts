import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { Tool } from '../tooling/entities/tool.entity';
import { ToolStatusHistory } from '../tooling/entities/tool-status-history.entity';
import { ToolStatus } from '../tooling/enums/tool-status.enum';
import {
  resolveWarehouseIds,
  WarehouseScope,
} from '../inventory/warehouse-scope.service';
import type { User } from '../users/entities/user.entity';
import { StageToolReservation } from './entities/stage-tool-reservation.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ToolReservationStatus } from './enums/tool-reservation-status.enum';
import { ProjectsService } from './projects.service';

/**
 * The material-style QR handover of tools reserved for a stage:
 * reserved → (crib) deliver → (stage responsible) receive → (after the stage
 * completes) return → (crib) receive-return. Deliver flips the tool to `in_use`
 * and receive-return back to `available`; it also drives the tool's assignment
 * and (on stage start/complete) its usage sessions, best-effort.
 */
@Injectable()
export class ToolReservationsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(StageToolReservation)
    private readonly reservations: Repository<StageToolReservation>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    @InjectRepository(ToolStatusHistory)
    private readonly toolStatusHistory: Repository<ToolStatusHistory>,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Flip a tool's status + append the immutable status-history row. Custody
   * lives on that row: pass `assignedTo` when flipping to in_use (the next
   * non-in_use row IS the return).
   */
  private async setToolStatus(
    tool: Tool,
    to: ToolStatus,
    user: User | undefined,
    note: string,
    assignedTo?: string,
  ): Promise<void> {
    const from = tool.status;
    await this.dataSource.transaction(async (manager) => {
      tool.status = to;
      await manager.save(tool);
      await manager.save(
        manager.create(ToolStatusHistory, {
          toolId: tool.id,
          fromStatus: from,
          toStatus: to,
          assignedTo: assignedTo ?? null,
          note,
          changedById: user?.id ?? null,
          changedByEmail: user?.email ?? null,
        }),
      );
    });
  }

  private async loadReservation(rid: string): Promise<StageToolReservation> {
    const res = await this.reservations.findOne({ where: { id: rid } });
    if (!res) throw new NotFoundException('Tool reservation not found');
    return res;
  }

  private async loadStage(stageId: string): Promise<ProcessStage> {
    const stage = await this.stages.findOne({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Stage not found');
    return stage;
  }

  private assertStageWorker(stage: ProcessStage, user?: User): void {
    if (
      user &&
      !ProjectsService.isAdmin(user) &&
      !(stage.workers ?? []).some((w) => w.id === user.id)
    ) {
      throw new ForbiddenException('Only a stage worker may do this');
    }
  }

  // --- handover verbs (by reservation id; the tool QR resolves the reservation) ---

  /** Crib hands the reserved tool out to the stage (tool must be available). */
  async deliver(rid: string, user: User): Promise<unknown[]> {
    const res = await this.loadReservation(rid);
    if (res.status !== ToolReservationStatus.Reserved) {
      throw new BadRequestException('Only a reserved tool can be delivered');
    }
    if (!res.tool || res.tool.status !== ToolStatus.Available) {
      throw new BadRequestException(
        `Araç teslim edilemez — müsait değil: ${res.tool?.code ?? ''} (${res.tool?.status ?? '-'})`,
      );
    }
    // The tool only flips to in_use when a worker RECEIVES it, so its status
    // no longer interlocks concurrent delivers — block explicitly while any
    // other reservation of this tool is mid-handover.
    const inFlight = await this.reservations.count({
      where: {
        toolId: res.toolId,
        status: In([
          ToolReservationStatus.Delivering,
          ToolReservationStatus.Received,
          ToolReservationStatus.Returning,
        ]),
      },
    });
    if (inFlight > 0) {
      throw new BadRequestException(
        'Araç teslim edilemez — başka bir aşamanın teslim/iade sürecinde.',
      );
    }
    const stage = await this.loadStage(res.stageId);
    res.status = ToolReservationStatus.Delivering;
    res.deliveredByUserId = user.id;
    res.deliveredAt = new Date();
    await this.reservations.save(res);

    for (const worker of stage.workers ?? []) {
      await this.notifications.notifyUser(
        worker.id,
        {
          type: NotificationType.ToolDelivering,
          title: 'Araç teslim edildi',
          message: `${res.tool.code} ${res.tool.name}: "${stage.name}" için teslim edildi — teslim alın`,
          link: `/tools/${res.toolId}`,
          entityType: 'tool',
          entityId: res.toolId,
        },
        user.id,
      );
    }
    return this.listForTool(res.toolId);
  }

  /**
   * A stage worker takes delivery (gates the stage start). THIS is the moment
   * the tool goes in_use and its assignment opens — not the crib's deliver.
   */
  async receive(rid: string, user: User): Promise<unknown[]> {
    const res = await this.loadReservation(rid);
    const stage = await this.loadStage(res.stageId);
    this.assertStageWorker(stage, user);
    if (res.status !== ToolReservationStatus.Delivering) {
      throw new BadRequestException('Only a delivering tool can be received');
    }
    if (res.tool) {
      await this.setToolStatus(
        res.tool,
        ToolStatus.InUse,
        user,
        `"${res.tool.name}" "${stage.name}" aşaması için teslim alındı`,
        `Aşama: ${stage.name}`,
      );
    }
    res.status = ToolReservationStatus.Received;
    res.receivedByUserId = user.id;
    res.receivedAt = new Date();
    await this.reservations.save(res);
    return this.listForTool(res.toolId);
  }

  /**
   * A stage worker sends the tool back to the crib. Allowed any time after
   * receive (work with the tool may finish before the stage does); completing
   * the stage reminds workers about any still-unreturned tools.
   */
  async returnTool(rid: string, user: User): Promise<unknown[]> {
    const res = await this.loadReservation(rid);
    const stage = await this.loadStage(res.stageId);
    this.assertStageWorker(stage, user);
    if (res.status !== ToolReservationStatus.Received) {
      throw new BadRequestException('Only a received tool can be returned');
    }
    res.status = ToolReservationStatus.Returning;
    res.returnedByUserId = user.id;
    res.returnedAt = new Date();
    await this.reservations.save(res);

    await this.notifications.notifyUser(
      res.tool?.rack?.zone?.warehouse?.responsibleUserId ?? null,
      {
        type: NotificationType.ToolReturning,
        title: 'Araç iadesi',
        message: `${res.tool?.code ?? ''} ${res.tool?.name ?? ''}: "${stage.name}" aşamasından iade ediliyor — teslim alın`,
        link: `/tools/${res.toolId}`,
        entityType: 'tool',
        entityId: res.toolId,
      },
      user.id,
    );
    return this.listForTool(res.toolId);
  }

  /** Crib receives the returned tool back into the pool (→ available). */
  async receiveReturn(rid: string, user: User): Promise<unknown[]> {
    const res = await this.loadReservation(rid);
    if (res.status !== ToolReservationStatus.Returning) {
      throw new BadRequestException('Only a returning tool can be re-received');
    }
    if (res.tool) {
      await this.setToolStatus(
        res.tool,
        ToolStatus.Available,
        user,
        `"${res.tool.name}" aşamadan iade alındı`,
      );
    }
    res.status = ToolReservationStatus.Returned;
    await this.reservations.save(res);
    return this.listForTool(res.toolId);
  }

  /**
   * Free a tool held by a reservation that is being removed (planning undo).
   * A `delivering` row leaves the tool still `available` (in_use starts at
   * receive), so the InUse check correctly skips it — nothing to undo.
   */
  async releaseReservation(
    res: StageToolReservation,
    user?: User,
  ): Promise<void> {
    const held = [
      ToolReservationStatus.Delivering,
      ToolReservationStatus.Received,
      ToolReservationStatus.Returning,
    ].includes(res.status);
    if (held && res.tool && res.tool.status === ToolStatus.InUse) {
      await this.setToolStatus(
        res.tool,
        ToolStatus.Available,
        user,
        'Araç rezervasyonu kaldırıldı',
      );
    }
  }

  // --- stage-start guard + usage hooks (called by ProcessStagesService) ---

  /**
   * Throws unless every tool reserved for the stage has been received. A tool
   * already returned (or on its way back) doesn't block — its work with the
   * stage finished early.
   */
  async assertAllReceived(stageId: string): Promise<void> {
    const rows = await this.reservations.find({ where: { stageId } });
    const notReceived = rows.filter(
      (r) =>
        r.status !== ToolReservationStatus.Received &&
        r.status !== ToolReservationStatus.Returning &&
        r.status !== ToolReservationStatus.Returned,
    );
    if (notReceived.length > 0) {
      throw new BadRequestException(
        `Bu aşama başlatılamaz: araçlar henüz teslim alınmadı: ${notReceived
          .map((r) => r.tool?.code ?? r.toolId)
          .join(', ')}`,
      );
    }
  }

  // --- per-tool list (handover screen + calendar) + warehouse pending queue ---

  private baseQuery() {
    return this.reservations
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.tool', 't')
      .leftJoinAndSelect('t.rack', 'rk')
      .leftJoinAndSelect('rk.zone', 'z')
      .leftJoinAndSelect('z.warehouse', 'w')
      .leftJoinAndSelect('r.stage', 's')
      // Recipients: the crib queue shows WHO will pick the tool up.
      .leftJoinAndSelect('s.workers', 'sw')
      .leftJoinAndSelect('s.process', 'p')
      .leftJoinAndSelect('p.orderItem', 'oi')
      .leftJoinAndSelect('oi.order', 'o')
      .leftJoinAndSelect('o.project', 'pr')
      .orderBy('r.createdAt', 'ASC');
  }

  /**
   * The tools that are mid-handover on ANY reservation (delivering / received
   * / returning) — a second reservation of such a tool cannot be delivered
   * yet, so the UI hides its Deliver button (mirrors the deliver() guard).
   */
  private async busyToolIds(toolIds: string[]): Promise<Set<string>> {
    if (toolIds.length === 0) return new Set();
    const rows = await this.reservations.find({
      where: {
        toolId: In(toolIds),
        status: In([
          ToolReservationStatus.Delivering,
          ToolReservationStatus.Received,
          ToolReservationStatus.Returning,
        ]),
      },
      loadEagerRelations: false,
    });
    return new Set(rows.map((r) => r.toolId));
  }

  private mapRow(r: StageToolReservation, busyTools: Set<string>): unknown {
    const order = r.stage?.process?.orderItem?.order ?? null;
    const warehouse = r.tool?.rack?.zone?.warehouse ?? null;
    return {
      id: r.id,
      status: r.status,
      deliverable:
        r.status === ToolReservationStatus.Reserved &&
        r.tool?.status === ToolStatus.Available &&
        !busyTools.has(r.toolId),
      reservedFrom: r.reservedFrom,
      reservedTo: r.reservedTo,
      deliveredAt: r.deliveredAt,
      receivedAt: r.receivedAt,
      returnedAt: r.returnedAt,
      tool: r.tool
        ? {
            id: r.tool.id,
            code: r.tool.code,
            name: r.tool.name,
            status: r.tool.status,
          }
        : null,
      warehouse: warehouse ? { id: warehouse.id, code: warehouse.code } : null,
      rack: r.tool?.rack ? { code: r.tool.rack.code } : null,
      stage: r.stage
        ? {
            id: r.stage.id,
            name: r.stage.name,
            status: r.stage.status,
            estimatedStartDate: r.stage.estimatedStartDate,
            estimatedCompletedDate: r.stage.estimatedCompletedDate,
            workers: (r.stage.workers ?? []).map((w) => ({
              id: w.id,
              name: w.name,
            })),
          }
        : null,
      order: order ? { orderNumber: order.orderNumber } : null,
      project: order?.project
        ? { code: order.project.code, name: order.project.name }
        : null,
    };
  }

  async listForTool(toolId: string): Promise<unknown[]> {
    const rows = await this.baseQuery()
      .where('r.toolId = :toolId', { toolId })
      .getMany();
    const busy = await this.busyToolIds([toolId]);
    return rows.map((r) => this.mapRow(r, busy));
  }

  /**
   * Warehouse-scoped pending reservations for the crib work queue (the
   * warehouse hub). Filters by reservation status and the tool's warehouse
   * (`tool → rack → zone.warehouseId`), restricted to the caller's scope.
   */
  async listPending(
    scope: WarehouseScope,
    statuses: ToolReservationStatus[],
    warehouseId?: string,
  ): Promise<unknown[]> {
    const warehouseIds = resolveWarehouseIds(scope, warehouseId);
    if (warehouseIds !== undefined && warehouseIds.length === 0) return [];
    const qb = this.baseQuery().where('r.status IN (:...statuses)', {
      statuses,
    });
    if (warehouseIds !== undefined) {
      qb.andWhere('z.warehouseId IN (:...warehouseIds)', { warehouseIds });
    }
    const rows = await qb.getMany();
    const busy = await this.busyToolIds([
      ...new Set(rows.map((r) => r.toolId)),
    ]);
    return rows.map((r) => this.mapRow(r, busy));
  }
}

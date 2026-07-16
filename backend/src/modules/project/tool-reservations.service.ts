import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { Tool } from '../tooling/entities/tool.entity';
import { ToolStatusHistory } from '../tooling/entities/tool-status-history.entity';
import { ToolStatus } from '../tooling/enums/tool-status.enum';
import { ToolsService } from '../tooling/tools.service';
import {
  resolveWarehouseIds,
  WarehouseScope,
} from '../inventory/warehouse-scope.service';
import type { User } from '../users/entities/user.entity';
import { StageToolReservation } from './entities/stage-tool-reservation.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ToolReservationStatus } from './enums/tool-reservation-status.enum';
import { ProcessStageStatus } from './enums/process-stage-status.enum';
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
    private readonly toolsService: ToolsService,
  ) {}

  private actor(user?: User): { id: string; email: string } | undefined {
    return user ? { id: user.id, email: user.email } : undefined;
  }

  /** Never let assignment/usage bookkeeping fail the handover itself. */
  private async bestEffort(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch {
      /* non-fatal integration side effect */
    }
  }

  /** Flip a tool's status + append the immutable status-history row. */
  private async setToolStatus(
    tool: Tool,
    to: ToolStatus,
    user: User | undefined,
    note: string,
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
    const stage = await this.loadStage(res.stageId);
    await this.setToolStatus(
      res.tool,
      ToolStatus.InUse,
      user,
      `"${res.tool.name}" "${stage.name}" aşamasına teslim için verildi`,
    );
    res.status = ToolReservationStatus.Delivering;
    res.deliveredByUserId = user.id;
    res.deliveredAt = new Date();
    await this.reservations.save(res);

    await this.bestEffort(() =>
      this.toolsService.assign(
        res.toolId,
        { assignedTo: `Aşama: ${stage.name}` },
        this.actor(user),
      ),
    );
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

  /** A stage worker takes delivery (gates the stage start). */
  async receive(rid: string, user: User): Promise<unknown[]> {
    const res = await this.loadReservation(rid);
    const stage = await this.loadStage(res.stageId);
    this.assertStageWorker(stage, user);
    if (res.status !== ToolReservationStatus.Delivering) {
      throw new BadRequestException('Only a delivering tool can be received');
    }
    res.status = ToolReservationStatus.Received;
    res.receivedByUserId = user.id;
    res.receivedAt = new Date();
    await this.reservations.save(res);
    return this.listForTool(res.toolId);
  }

  /** A stage worker sends the tool back to the crib (after completion). */
  async returnTool(rid: string, user: User): Promise<unknown[]> {
    const res = await this.loadReservation(rid);
    const stage = await this.loadStage(res.stageId);
    this.assertStageWorker(stage, user);
    if (res.status !== ToolReservationStatus.Received) {
      throw new BadRequestException('Only a received tool can be returned');
    }
    if (stage.status !== ProcessStageStatus.Completed) {
      throw new BadRequestException('Aşama tamamlanmadan araç iade edilemez');
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
    await this.bestEffort(() =>
      this.toolsService.return(
        res.toolId,
        { note: 'Aşama iadesi' },
        this.actor(user),
      ),
    );
    return this.listForTool(res.toolId);
  }

  /** Free a tool held by a reservation that is being removed (planning undo). */
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
      await this.bestEffort(() =>
        this.toolsService.return(
          res.toolId,
          { note: 'Rezervasyon kaldırıldı' },
          this.actor(user),
        ),
      );
    }
  }

  // --- stage-start guard + usage hooks (called by ProcessStagesService) ---

  /** Throws unless every tool reserved for the stage has been received. */
  async assertAllReceived(stageId: string): Promise<void> {
    const rows = await this.reservations.find({ where: { stageId } });
    const notReceived = rows.filter(
      (r) => r.status !== ToolReservationStatus.Received,
    );
    if (notReceived.length > 0) {
      throw new BadRequestException(
        `Bu aşama başlatılamaz: araçlar henüz teslim alınmadı: ${notReceived
          .map((r) => r.tool?.code ?? r.toolId)
          .join(', ')}`,
      );
    }
  }

  /** Stage started → begin a usage session for each received tool. */
  async onStageStart(stageId: string, user?: User): Promise<void> {
    const rows = await this.reservations.find({
      where: { stageId, status: ToolReservationStatus.Received },
    });
    if (rows.length === 0) return;
    const stage = await this.loadStage(stageId);
    for (const r of rows) {
      await this.bestEffort(() =>
        this.toolsService.startUsage(
          r.toolId,
          { usedFor: `Aşama: ${stage.name}` },
          this.actor(user),
        ),
      );
    }
  }

  /** Stage completed/reset → end any usage session on the stage's tools. */
  async onStageEnd(stageId: string): Promise<void> {
    const rows = await this.reservations.find({ where: { stageId } });
    for (const r of rows) {
      await this.bestEffort(() => this.toolsService.endUsage(r.toolId, {}));
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
      .leftJoinAndSelect('s.process', 'p')
      .leftJoinAndSelect('p.orderItem', 'oi')
      .leftJoinAndSelect('oi.order', 'o')
      .leftJoinAndSelect('o.project', 'pr')
      .orderBy('r.createdAt', 'ASC');
  }

  private mapRow(r: StageToolReservation): unknown {
    const order = r.stage?.process?.orderItem?.order ?? null;
    const warehouse = r.tool?.rack?.zone?.warehouse ?? null;
    return {
      id: r.id,
      status: r.status,
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
    return rows.map((r) => this.mapRow(r));
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
    return rows.map((r) => this.mapRow(r));
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockItemStatus } from '../inventory/enums/stock-item-status.enum';
import type { User } from '../users/entities/user.entity';
import { Process } from './entities/process.entity';
import { StageToolReservation } from './entities/stage-tool-reservation.entity';
import { ProcessStageStatus } from './enums/process-stage-status.enum';
import { ProcessStatus } from './enums/process-status.enum';
import { ToolReservationStatus } from './enums/tool-reservation-status.enum';

export interface MyStockItemView {
  id: string;
  quantity: number;
  status: string;
  receivedAt: Date | null;
  material: { code: string; name: string; unit: string | null } | null;
  lot: { lotNumber: string } | null;
  warehouse: { code: string } | null;
  orderNumber: string | null;
  stageName: string | null;
}

export interface MyToolView {
  id: string;
  status: string;
  receivedAt: Date | null;
  tool: { id: string; code: string; name: string } | null;
  stageName: string | null;
}

export interface MyResponsibilityView {
  id: string;
  overallStatus: string;
  projectId: string | null;
  projectName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderItemId: string | null;
  orderItemName: string | null;
  completedStages: number;
  totalStages: number;
  stages: Array<{
    id: string;
    name: string;
    sequence: number;
    status: string;
    estimatedStartDate: string | null;
    estimatedCompletedDate: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    estimatedDurationHours: number | null;
    durationHours: number | null;
    workers: string[];
  }>;
}

/**
 * The current user's personal work data — everything is SELF-scoped (each
 * caller only ever sees their own rows), so the routes carry no permission
 * key (mirrors the /stage-board precedent).
 */
@Injectable()
export class MyWorkService {
  constructor(
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    @InjectRepository(StageToolReservation)
    private readonly toolReservations: Repository<StageToolReservation>,
    @InjectRepository(Process)
    private readonly processes: Repository<Process>,
  ) {}

  /**
   * Processes the user is RESPONSIBLE for, with the full stage progress of
   * each — a responsible must see every stage of their process on the
   * dashboard, not only stages they work on themselves. Only running work is
   * shown: draft + in_progress (completed processes drop off the dashboard).
   */
  async responsibilities(user: User): Promise<MyResponsibilityView[]> {
    const rows = await this.processes.find({
      where: {
        responsibleUserId: user.id,
        overallStatus: In([ProcessStatus.Draft, ProcessStatus.InProgress]),
      },
      relations: {
        stages: { workers: true },
        orderItem: { order: { project: true } },
      },
      loadEagerRelations: false,
      order: { createdAt: 'DESC' },
    });
    return rows.map((p) => {
      const stages = [...(p.stages ?? [])].sort(
        (a, b) => a.sequence - b.sequence,
      );
      return {
        id: p.id,
        overallStatus: p.overallStatus,
        projectId: p.orderItem?.order?.projectId ?? null,
        projectName: p.orderItem?.order?.project?.name ?? null,
        orderId: p.orderItem?.orderId ?? null,
        orderNumber: p.orderItem?.order?.orderNumber ?? null,
        orderItemId: p.orderItem?.id ?? null,
        orderItemName: p.orderItem?.name ?? null,
        completedStages: stages.filter(
          (s) => s.status === ProcessStageStatus.Completed,
        ).length,
        totalStages: stages.length,
        stages: stages.map((s) => ({
          id: s.id,
          name: s.name,
          sequence: s.sequence,
          status: s.status,
          // Dates feed the dashboard Gantt (actuals win over estimates).
          estimatedStartDate: s.estimatedStartDate,
          estimatedCompletedDate: s.estimatedCompletedDate,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          estimatedDurationHours: s.estimatedDurationHours,
          durationHours: s.durationHours,
          workers: (s.workers ?? []).map((w) => w.name),
        })),
      };
    });
  }

  /**
   * Materials and tools currently checked out to the user: stock items they
   * RECEIVED that are still with them (`delivered`, or `returning` = on the
   * way back), and tool reservations they received (`received`/`returning`).
   * Shallow explicit relations — the eager trees on these entities would
   * otherwise cartesian-explode (see the stock-items perf gotcha).
   */
  async checkouts(user: User): Promise<{
    stockItems: MyStockItemView[];
    tools: MyToolView[];
  }> {
    const [items, reservations] = await Promise.all([
      this.stockItems.find({
        where: {
          receivedByUserId: user.id,
          status: In([StockItemStatus.Delivered, StockItemStatus.Returning]),
        },
        relations: {
          lot: { material: { materialUnit: true } },
          warehouse: true,
          order: true,
          stage: true,
        },
        loadEagerRelations: false,
        order: { receivedAt: 'DESC' },
      }),
      this.toolReservations.find({
        where: {
          receivedByUserId: user.id,
          status: In([
            ToolReservationStatus.Received,
            ToolReservationStatus.Returning,
          ]),
        },
        relations: { tool: true, stage: true },
        loadEagerRelations: false,
        order: { receivedAt: 'DESC' },
      }),
    ]);

    return {
      stockItems: items.map((it) => ({
        id: it.id,
        quantity: it.quantity,
        status: it.status,
        receivedAt: it.receivedAt,
        material: it.lot?.material
          ? {
              code: it.lot.material.code,
              name: it.lot.material.name,
              unit: it.lot.material.materialUnit?.name ?? null,
            }
          : null,
        lot: it.lot ? { lotNumber: it.lot.lotNumber } : null,
        warehouse: it.warehouse ? { code: it.warehouse.code } : null,
        orderNumber: it.order?.orderNumber ?? null,
        stageName: it.stage?.name ?? null,
      })),
      tools: reservations.map((r) => ({
        id: r.id,
        status: r.status,
        receivedAt: r.receivedAt,
        tool: r.tool
          ? { id: r.tool.id, code: r.tool.code, name: r.tool.name }
          : null,
        stageName: r.stage?.name ?? null,
      })),
    };
  }
}

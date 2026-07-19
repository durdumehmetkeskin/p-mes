import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsWhere,
  In,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProjectsService } from '../project/projects.service';
import type { User } from '../users/entities/user.entity';
import { Location } from './entities/location.entity';
import { SectionReservation } from './entities/section-reservation.entity';
import { Section } from './entities/section.entity';

/** One stage of a reserved order, with its schedule resolved for the Gantt. */
export interface SectionScheduleStage {
  id: string;
  name: string;
  sequence: number;
  status: string;
  processId: string;
  /** The "which process" label (the owning order item's name). */
  processName: string | null;
  orderItemName: string | null;
  /** Comma-joined names of the stage's workers (stages have no responsible). */
  workerNames: string | null;
  start: string | null;
  end: string | null;
  estimatedDurationHours: number | null;
  durationHours: number | null;
}

export interface SectionScheduleReservation {
  id: string;
  startDate: string;
  endDate: string;
  startAt: Date | null;
  endAt: Date | null;
  /** The planned stage this reservation belongs to (null = order-level). */
  stageId: string | null;
  note: string | null;
  orderId: string;
  orderNumber: string;
  orderName: string | null;
  orderStatus: string | null;
  orderDueDate: string | null;
  projectId: string | null;
  projectName: string | null;
  stages: SectionScheduleStage[];
}

export interface LocationSchedule {
  location: { id: string; code: string; name: string };
  reservations: Array<
    SectionScheduleReservation & {
      section: { id: string; code: string; name: string } | null;
    }
  >;
}

export interface SectionSchedule {
  section: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    locationId: string;
    locationCode: string | null;
    locationName: string | null;
  };
  reservations: SectionScheduleReservation[];
}

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

@Injectable()
export class SectionScheduleService {
  constructor(
    @InjectRepository(Section)
    private readonly sections: Repository<Section>,
    @InjectRepository(SectionReservation)
    private readonly reservations: Repository<SectionReservation>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    private readonly projects: ProjectsService,
  ) {}

  /**
   * Everything the section-detail Gantt needs in one call: the section, its
   * reservations (which order/project holds it and when), and each reserved
   * order's stages with schedules resolved the same way as the workload Gantt
   * (completed → actual window, in_progress → started..estimated end, pending
   * → planned window). Non-admins only see reservations of their member
   * projects' orders.
   */
  async scheduleForSection(
    sectionId: string,
    options: { from?: string; to?: string; user?: User } = {},
  ): Promise<SectionSchedule> {
    const section = await this.sections.findOne({
      where: { id: sectionId },
      relations: { location: true },
    });
    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    const where: FindOptionsWhere<SectionReservation> = { sectionId };
    // Window filter keeps any reservation overlapping [from, to].
    if (options.to) where.startDate = LessThanOrEqual(options.to);
    if (options.from) where.endDate = MoreThanOrEqual(options.from);
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      const ids = await this.projects.memberProjectIds(options.user.id);
      where.order = { projectId: In(ids) };
    }
    const rows = await this.reservations.find({
      where,
      order: { startDate: 'ASC' },
    });

    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const stagesByOrder = await this.stagesByOrder(orderIds);

    return {
      section: {
        id: section.id,
        code: section.code,
        name: section.name,
        description: section.description,
        isActive: section.isActive,
        locationId: section.locationId,
        locationCode: section.location?.code ?? null,
        locationName: section.location?.name ?? null,
      },
      reservations: rows.map((r) => ({
        id: r.id,
        startDate: r.startDate,
        endDate: r.endDate,
        startAt: r.startAt,
        endAt: r.endAt,
        stageId: r.stageId,
        note: r.note,
        orderId: r.orderId,
        orderNumber: r.order?.orderNumber ?? '',
        orderName: r.order?.name ?? null,
        orderStatus: r.order?.status ?? null,
        orderDueDate: r.order?.dueDate ?? null,
        projectId: r.order?.project?.id ?? null,
        projectName: r.order?.project?.name ?? null,
        stages: stagesByOrder.get(r.orderId) ?? [],
      })),
    };
  }

  /**
   * The whole LOCATION's calendar: every reservation across all of its
   * sections (member-scoped like the section schedule) plus each reserved
   * order's stages — the client classifies rows as reserved / running /
   * completed via the linked stage's status.
   */
  async scheduleForLocation(
    locationId: string,
    options: { from?: string; to?: string; user?: User } = {},
  ): Promise<LocationSchedule> {
    const location = await this.sections.manager
      .getRepository(Location)
      .findOne({ where: { id: locationId } });
    if (!location) {
      throw new NotFoundException(`Location ${locationId} not found`);
    }

    const where: FindOptionsWhere<SectionReservation> = {
      section: { locationId },
    };
    if (options.to) where.startDate = LessThanOrEqual(options.to);
    if (options.from) where.endDate = MoreThanOrEqual(options.from);
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      const ids = await this.projects.memberProjectIds(options.user.id);
      where.order = { projectId: In(ids) };
    }
    const rows = await this.reservations.find({
      where,
      order: { startDate: 'ASC' },
    });

    const orderIds = [...new Set(rows.map((r) => r.orderId))];
    const stagesByOrder = await this.stagesByOrder(orderIds);

    return {
      location: {
        id: location.id,
        code: location.code,
        name: location.name,
      },
      reservations: rows.map((r) => ({
        id: r.id,
        startDate: r.startDate,
        endDate: r.endDate,
        startAt: r.startAt,
        endAt: r.endAt,
        stageId: r.stageId,
        note: r.note,
        orderId: r.orderId,
        orderNumber: r.order?.orderNumber ?? '',
        orderName: r.order?.name ?? null,
        orderStatus: r.order?.status ?? null,
        orderDueDate: r.order?.dueDate ?? null,
        projectId: r.order?.project?.id ?? null,
        projectName: r.order?.project?.name ?? null,
        stages: stagesByOrder.get(r.orderId) ?? [],
        section: r.section
          ? { id: r.section.id, code: r.section.code, name: r.section.name }
          : null,
      })),
    };
  }

  /** All stages of the given orders, keyed by order id (workload-style query). */
  private async stagesByOrder(
    orderIds: string[],
  ): Promise<Map<string, SectionScheduleStage[]>> {
    const byOrder = new Map<string, SectionScheduleStage[]>();
    if (!orderIds.length) return byOrder;

    const rows = await this.stages
      .createQueryBuilder('s')
      .innerJoin(
        'processes',
        'p',
        'p.id = s.process_id AND p."deletedAt" IS NULL',
      )
      .innerJoin(
        'order_items',
        'li',
        'li.id = p.order_item_id AND li."deletedAt" IS NULL',
      )
      .select('s.id', 'id')
      .addSelect('s.name', 'name')
      .addSelect('s.sequence', 'sequence')
      .addSelect('s.status', 'status')
      .addSelect('s.started_at', 'startedAt')
      .addSelect('s.completed_at', 'completedAt')
      .addSelect('s.estimated_start_date', 'estStart')
      .addSelect('s.estimated_completed_date', 'estEnd')
      .addSelect('s.estimated_duration_hours', 'estimatedDurationHours')
      .addSelect('s.duration_hours', 'durationHours')
      .addSelect(
        '(SELECT string_agg(u2.name, \', \' ORDER BY u2.name) FROM process_stage_workers w2 JOIN users u2 ON u2.id = w2.user_id WHERE w2.stage_id = s.id)',
        'workerNames',
      )
      .addSelect('p.id', 'processId')
      // Categories were removed — the order item names the process.
      .addSelect('li.name', 'processName')
      .addSelect('li.name', 'orderItemName')
      .addSelect('li.order_id', 'orderId')
      .where('li.order_id IN (:...orderIds)', { orderIds })
      .orderBy('li.order_id')
      .addOrderBy('s.sequence', 'ASC')
      .getRawMany<Record<string, unknown>>();

    const now = new Date().toISOString();
    for (const r of rows) {
      const status = String(r.status ?? '');
      const startedAt = toIso(r.startedAt);
      const completedAt = toIso(r.completedAt);
      const estStart = toIso(r.estStart);
      const estEnd = toIso(r.estEnd);

      // Same status-based date resolution as WorkloadService.getWorkload.
      let start: string | null;
      let end: string | null;
      if (status === 'completed') {
        start = startedAt ?? estStart;
        end = completedAt ?? estEnd ?? start;
      } else if (status === 'in_progress') {
        start = startedAt ?? estStart;
        end = estEnd ?? now;
      } else {
        start = estStart;
        end = estEnd ?? estStart;
      }

      const orderId = String(r.orderId);
      let bucket = byOrder.get(orderId);
      if (!bucket) {
        bucket = [];
        byOrder.set(orderId, bucket);
      }
      bucket.push({
        id: String(r.id),
        name: String(r.name ?? ''),
        sequence: toNum(r.sequence) ?? 0,
        status,
        processId: String(r.processId),
        processName: r.processName == null ? null : String(r.processName),
        orderItemName: r.orderItemName == null ? null : String(r.orderItemName),
        workerNames: r.workerNames == null ? null : String(r.workerNames),
        start,
        end,
        estimatedDurationHours: toNum(r.estimatedDurationHours),
        durationHours: toNum(r.durationHours),
      });
    }
    return byOrder;
  }
}

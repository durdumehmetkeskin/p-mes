import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { User } from '../../users/entities/user.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { COLOR, STAGE_STATUS_SEGMENTS, paletteColor } from '../report-theme';
import {
  buildTimeline,
  busyDayCount,
  capTimeline,
  dailyOccupancy,
} from '../report-geometry';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

const STATUS_COLOR: Record<string, string> = {
  completed: COLOR.completed,
  in_progress: COLOR.inProgress,
  pending: COLOR.pending,
};

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const ms = new Date(s).getTime();
  return isNaN(ms) ? null : new Date(ms).toISOString();
}

function elapsedHours(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 3_600_000) * 10) / 10;
}

// Heat-map color for a day's occupancy count (empty → light, busiest → teal).
const HEAT_STEPS = ['#eef2f7', '#cdeae6', '#7fcdc2', '#39a394', '#0d9488'];
function heatColor(value: number, max: number): string {
  if (value <= 0 || max <= 0) return HEAT_STEPS[0];
  const ratio = value / max;
  const idx = Math.min(
    HEAT_STEPS.length - 1,
    1 + Math.floor(ratio * (HEAT_STEPS.length - 1)),
  );
  return HEAT_STEPS[idx];
}

/**
 * Detailed personnel report ("Personel Raporu"): a person's occupancy calendar
 * over a date range, the stages they completed and every order/process stage
 * assigned to them. Stage windows resolve by status the same way the workload
 * Gantt does (actual when known, planned otherwise).
 */
@Injectable()
export class PersonnelReportDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.PersonnelReport;
  readonly label = 'Personel Raporu';
  readonly params: ReportParamField[] = [
    { name: 'userId', label: 'Personnel', type: 'user', required: true },
    { name: 'from', label: 'From date', type: 'date', required: false },
    { name: 'to', label: 'To date', type: 'date', required: false },
  ];

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const userId = String(params.userId ?? '');
    if (!userId) throw new BadRequestException('userId is required');
    const from = params.from ? String(params.from) : undefined;
    const to = params.to ? String(params.to) : undefined;

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    // Stages the user works on — resolve ids first (a where on the eager
    // `workers` relation would silently filter the loaded relation itself).
    const idRows: Array<{ id: string }> = await this.stages
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .where(
        'EXISTS (SELECT 1 FROM process_stage_workers w WHERE w.stage_id = s.id AND w.user_id = :uid)',
        { uid: userId },
      )
      .getRawMany();
    const stageRows =
      idRows.length === 0
        ? []
        : await this.stages.find({
            where: { id: In(idRows.map((r) => r.id)) },
            // Load the order/project/category context explicitly (these live
            // behind a non-eager process relation, so eager flags don't
            // cascade in here).
            relations: {
              process: {
                orderItem: { order: { project: true } },
              },
            },
            order: { startedAt: 'ASC' },
          });

    const now = new Date().toISOString();
    const fromCmp = from ? from.slice(0, 10) : null;
    const toCmp = to ? to.slice(0, 10) : null;

    interface Item {
      id: string;
      name: string;
      status: string;
      orderNumber: string | null;
      projectName: string | null;
      processCategory: string | null;
      start: string | null;
      end: string | null;
      startedAt: string | null;
      completedAt: string | null;
      estimatedStartDate: string | null;
      estimatedCompletedDate: string | null;
      durationHours: number | null;
      elapsedHours: number | null;
    }

    const items: Item[] = [];
    for (const s of stageRows) {
      const startedAt = toIso(s.startedAt);
      const completedAt = toIso(s.completedAt);
      const estStart = toIso(s.estimatedStartDate);
      const estEnd = toIso(s.estimatedCompletedDate);

      let start: string | null;
      let end: string | null;
      if (s.status === 'completed') {
        start = startedAt ?? estStart;
        end = completedAt ?? estEnd ?? start;
      } else if (s.status === 'in_progress') {
        start = startedAt ?? estStart;
        end = estEnd ?? now;
      } else {
        start = estStart;
        end = estEnd ?? estStart;
      }

      // The window filter only applies to stages that carry a placeable date;
      // an undated (e.g. unplanned pending, no estimate) stage is still a real
      // assignment and must remain in the tables and counters.
      if (start) {
        const startDay = start.slice(0, 10);
        const endDay = (end ?? start).slice(0, 10);
        if (toCmp && startDay > toCmp) continue;
        if (fromCmp && endDay < fromCmp) continue;
      }

      const order = s.process?.orderItem?.order;
      items.push({
        id: s.id,
        name: s.name,
        status: s.status,
        orderNumber: order?.orderNumber ?? null,
        projectName: order?.project?.name ?? null,
        processCategory: null,
        start,
        end,
        startedAt,
        completedAt,
        estimatedStartDate: s.estimatedStartDate,
        estimatedCompletedDate: s.estimatedCompletedDate,
        durationHours: s.durationHours,
        elapsedHours: elapsedHours(startedAt, completedAt),
      });
    }

    items.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

    // ---- Counters ----
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    let totalHours = 0;
    const projectLoad = new Map<string, number>();
    for (const it of items) {
      if (it.status === 'completed') completed += 1;
      else if (it.status === 'in_progress') inProgress += 1;
      else pending += 1;
      totalHours += Number(it.durationHours ?? 0);
      const key = it.projectName ?? '—';
      projectLoad.set(key, (projectLoad.get(key) ?? 0) + 1);
    }

    // ---- Occupancy calendar (Gantt + per-day strip) ----
    // Only dated stages can be placed on the Gantt; undated ones stay in the
    // tables/counters but are omitted from the timeline rows.
    const timeline = capTimeline(
      buildTimeline(
        items
          .filter((it) => it.start)
          .map((it) => ({
            id: it.id,
            label: it.name,
            sublabel: it.orderNumber,
            start: it.start,
            end: it.end,
            color: STATUS_COLOR[it.status] ?? COLOR.neutral,
            meta: { status: it.status, project: it.projectName },
          })),
        from ?? null,
        to ?? null,
      ),
    );
    const occRows = items.map((it) => ({ start: it.start, end: it.end }));
    const occupancyRaw = dailyOccupancy(
      occRows,
      timeline.windowStart,
      timeline.windowEnd,
    );
    const busyDays = busyDayCount(
      occRows,
      timeline.windowStart,
      timeline.windowEnd,
    );
    const maxOcc = occupancyRaw.reduce((m, d) => Math.max(m, d.value), 0);
    const occupancy = occupancyRaw.map((d) => ({
      ...d,
      color: heatColor(d.value, maxOcc),
    }));

    // Per-project load bars (top 10).
    const ranked = [...projectLoad.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const maxLoad = ranked.reduce((m, r) => Math.max(m, r.value), 0);
    const projectLoadBars = ranked.map((r, i) => ({
      ...r,
      pct: maxLoad > 0 ? (r.value / maxLoad) * 100 : 0,
      color: paletteColor(i),
    }));

    const completedItems = items
      .filter((it) => it.status === 'completed')
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));

    return {
      generatedAt: new Date().toISOString(),
      subject:
        from || to ? `${user.name} ${from ?? ''}-${to ?? ''}` : user.name,
      personnel: {
        name: user.name,
        email: user.email,
        roles: Array.isArray(user.roles)
          ? user.roles
              .map((r) => (typeof r === 'string' ? r : r?.name))
              .join(', ')
          : null,
      },
      window: { from: from ?? null, to: to ?? null },
      summary: {
        totalAssigned: items.length,
        completed,
        inProgress,
        pending,
        totalHours,
        busyDays,
        projectCount: projectLoad.size,
      },
      charts: {
        statusDist: STAGE_STATUS_SEGMENTS(completed, inProgress, pending),
        projectLoad: projectLoadBars,
        occupancy,
      },
      timeline,
      items,
      completedItems,
    };
  }
}

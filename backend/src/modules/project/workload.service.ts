import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessStage } from './entities/process-stage.entity';

export interface WorkItem {
  id: string;
  kind: 'stage' | 'process';
  title: string;
  orderNumber: string;
  projectName: string;
  start: string | null;
  end: string | null;
  status: string;
}

export interface WorkloadUser {
  userId: string;
  userName: string;
  items: WorkItem[];
}

function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

@Injectable()
export class WorkloadService {
  constructor(
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
  ) {}

  /** Shared joins/selects for both assignment kinds (responsible / worker). */
  private baseStageQuery() {
    return this.stages
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
      .innerJoin('orders', 'o', 'o.id = li.order_id AND o."deletedAt" IS NULL')
      .innerJoin(
        'projects',
        'proj',
        'proj.id = o.project_id AND proj."deletedAt" IS NULL',
      )
      .select('s.id', 'id')
      .addSelect('s.name', 'title')
      .addSelect('s.status', 'status')
      .addSelect('s.started_at', 'startedAt')
      .addSelect('s.completed_at', 'completedAt')
      .addSelect('s.estimated_start_date', 'estStart')
      .addSelect('s.estimated_completed_date', 'estEnd')
      .addSelect('u.name', 'userName')
      .addSelect('o.order_number', 'orderNumber')
      .addSelect('proj.name', 'projectName');
  }

  /**
   * Per-user Gantt built from the stages each user works on (stage
   * workers). Date range resolves by stage status:
   *  - completed  → actual startedAt → completedAt
   *  - in_progress→ actual startedAt → estimatedCompletedDate (or now)
   *  - pending    → estimatedStartDate → estimatedCompletedDate
   */
  async getWorkload(from?: string, to?: string): Promise<WorkloadUser[]> {
    const stageRows = await this.baseStageQuery()
      .innerJoin('process_stage_workers', 'w', 'w.stage_id = s.id')
      .innerJoin('users', 'u', 'u.id = w.user_id')
      .addSelect('w.user_id', 'userId')
      .getRawMany();

    const now = new Date().toISOString();
    const byUser = new Map<string, WorkloadUser>();

    for (const r of stageRows) {
      const status = String(r.status ?? '');
      const startedAt = toIso(r.startedAt);
      const completedAt = toIso(r.completedAt);
      const estStart = toIso(r.estStart);
      const estEnd = toIso(r.estEnd);

      let start: string | null;
      let end: string | null;
      if (status === 'completed') {
        start = startedAt ?? estStart;
        end = completedAt ?? estEnd ?? start;
      } else if (status === 'in_progress') {
        start = startedAt ?? estStart;
        end = estEnd ?? now;
      } else {
        // pending / not started yet → planned window
        start = estStart;
        end = estEnd ?? estStart;
      }

      if (!start) continue; // nothing to place on the timeline
      // `from`/`to` are date-only (YYYY-MM-DD) while start/end are full ISO
      // timestamps; compare on the date portion so a work item on the exact
      // boundary day is included (e.g. a stage starting on the `to` date).
      if (from && end && end.slice(0, 10) < from) continue;
      if (to && start.slice(0, 10) > to) continue;

      const userId = String(r.userId);
      let bucket = byUser.get(userId);
      if (!bucket) {
        bucket = { userId, userName: String(r.userName), items: [] };
        byUser.set(userId, bucket);
      }
      bucket.items.push({
        id: String(r.id),
        kind: 'stage',
        title: String(r.title ?? ''),
        orderNumber: String(r.orderNumber ?? ''),
        projectName: String(r.projectName ?? ''),
        start,
        end,
        status,
      });
    }

    const users = [...byUser.values()];
    users.forEach((u) =>
      u.items.sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')),
    );
    users.sort((a, b) => a.userName.localeCompare(b.userName));
    return users;
  }
}

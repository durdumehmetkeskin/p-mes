import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { User } from '../users/entities/user.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ProjectsService } from './projects.service';

export interface StageCard {
  id: string;
  name: string;
  sequence: number;
  status: string;
  projectId: string | null;
  projectName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  processId: string;
  processName: string | null;
  estimatedStartDate: string | null;
  estimatedCompletedDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface StageBoard {
  isAdmin: boolean;
  cards: StageCard[];
}

/**
 * Kanban feed of process stages. A non-admin only sees the stages they work
 * on; an admin sees everyone's, narrowed by the project / user / date
 * filters. Status changes go through the existing stage-status endpoint
 * (sequential gating preserved).
 */
@Injectable()
export class StageBoardService {
  constructor(
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
  ) {}

  async getBoard(options: {
    user?: User;
    projectId?: string;
    userId?: string;
    from?: string;
    to?: string;
  }): Promise<StageBoard> {
    const isAdmin = ProjectsService.isAdmin(options.user);

    const qb = this.stages
      .createQueryBuilder('s')
      .innerJoin('s.process', 'p')
      .innerJoin('p.orderItem', 'li')
      .innerJoin('li.order', 'o')
      .innerJoin('o.project', 'proj')
      // "Assigned" = has at least one worker.
      .where(
        'EXISTS (SELECT 1 FROM process_stage_workers w WHERE w.stage_id = s.id)',
      );

    if (!isAdmin) {
      // A regular user only sees stages they work on; ignore admin filters.
      qb.andWhere(
        'EXISTS (SELECT 1 FROM process_stage_workers w WHERE w.stage_id = s.id AND w.user_id = :uid)',
        { uid: options.user?.id ?? null },
      );
    } else {
      if (options.userId) {
        qb.andWhere(
          'EXISTS (SELECT 1 FROM process_stage_workers w WHERE w.stage_id = s.id AND w.user_id = :uid)',
          { uid: options.userId },
        );
      }
      if (options.projectId) {
        qb.andWhere('proj.id = :pid', { pid: options.projectId });
      }
      // Filter on the effective start date (actual, else planned).
      if (options.from) {
        qb.andWhere(
          'COALESCE(s.started_at::date, s.estimated_start_date) >= :from',
          { from: options.from },
        );
      }
      if (options.to) {
        qb.andWhere(
          'COALESCE(s.started_at::date, s.estimated_start_date) <= :to',
          { to: options.to },
        );
      }
    }

    const rows = await qb
      .select([
        's.id AS id',
        's.name AS name',
        's.sequence AS sequence',
        's.status AS status',
        's.process_id AS "processId"',
        's.estimated_start_date AS "estimatedStartDate"',
        's.estimated_completed_date AS "estimatedCompletedDate"',
        's.started_at AS "startedAt"',
        's.completed_at AS "completedAt"',
        'li.name AS "processName"',
        'o.id AS "orderId"',
        'o.order_number AS "orderNumber"',
        'proj.id AS "projectId"',
        'proj.name AS "projectName"',
      ])
      .orderBy('proj.name', 'ASC')
      .addOrderBy('o.order_number', 'ASC')
      .addOrderBy('s.sequence', 'ASC')
      .getRawMany<
        StageCard & { startedAt: Date | null; completedAt: Date | null }
      >();

    const cards: StageCard[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      sequence: Number(r.sequence),
      status: r.status,
      projectId: r.projectId,
      projectName: r.projectName,
      orderId: r.orderId,
      orderNumber: r.orderNumber,
      processId: r.processId,
      processName: r.processName,
      estimatedStartDate: r.estimatedStartDate,
      estimatedCompletedDate: r.estimatedCompletedDate,
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    }));

    return { isAdmin, cards };
  }
}

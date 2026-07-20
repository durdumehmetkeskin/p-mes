import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, Repository } from 'typeorm';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { Project } from '../project/entities/project.entity';
import { ProcessStageStatus } from '../project/enums/process-stage-status.enum';
import { ProcessStatus } from '../project/enums/process-status.enum';
import {
  NotificationsService,
  NotificationType,
} from './notifications.service';

const LEAD_DAYS = 3;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Daily scan for approaching / passed deadlines on stages, processes and
 * projects → notifies admins. Deduped (one alert per item per phase).
 */
@Injectable()
export class DeadlineScannerService {
  private readonly logger = new Logger(DeadlineScannerService.name);

  constructor(
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    @InjectRepository(Process)
    private readonly processes: Repository<Process>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 8 * * *')
  async scheduledScan(): Promise<void> {
    const n = await this.scan();
    this.logger.log(`Deadline scan sent ${n} notification batches`);
  }

  /** Returns the number of alert batches created (approaching + passed). */
  async scan(): Promise<number> {
    const today = iso(new Date());
    const horizon = iso(new Date(Date.now() + LEAD_DAYS * 86_400_000));
    let batches = 0;

    const emit = async (
      due: string,
      entityType: string,
      entityId: string,
      label: string,
      link: string,
    ) => {
      const passed = due < today;
      const type = passed
        ? NotificationType.DeadlinePassed
        : NotificationType.DeadlineApproaching;
      if (await this.notifications.existsFor(type, entityId)) return;
      await this.notifications.notifyAdmins({
        type,
        title: passed ? 'Termin geçti' : 'Termin yaklaşıyor',
        message: `${label} — son teslim tarihi ${due} ${passed ? 'geçti' : 'yaklaşıyor'}.`,
        link,
        entityType,
        entityId,
      });
      batches += 1;
    };

    // Stages (skip completed) with a due date up to the horizon.
    const stages = await this.stages.find({
      where: {
        estimatedCompletedDate: LessThanOrEqual(horizon),
        status: Not(ProcessStageStatus.Completed),
      },
    });
    for (const s of stages) {
      if (!s.estimatedCompletedDate) continue;
      await emit(
        s.estimatedCompletedDate,
        'process-stage',
        s.id,
        `"${s.name}" aşaması`,
        '/board',
      );
    }

    // Processes (skip completed).
    const processes = await this.processes.find({
      where: {
        estimatedCompletedDate: LessThanOrEqual(horizon),
        overallStatus: Not(ProcessStatus.Completed),
      },
    });
    for (const p of processes) {
      if (!p.estimatedCompletedDate) continue;
      const order = p.orderItem?.order;
      const link = order
        ? `/projects/${order.projectId}/orders/${p.orderItem.orderId}`
        : '/board';
      await emit(p.estimatedCompletedDate, 'process', p.id, 'Süreç', link);
    }

    // Projects (skip inactive).
    const projects = await this.projects.find({
      where: { endDate: LessThanOrEqual(horizon), isActive: true },
    });
    for (const pr of projects) {
      if (!pr.endDate) continue;
      await emit(
        pr.endDate,
        'project',
        pr.id,
        `"${pr.name}" projesi`,
        `/projects/${pr.id}`,
      );
    }

    return batches;
  }
}

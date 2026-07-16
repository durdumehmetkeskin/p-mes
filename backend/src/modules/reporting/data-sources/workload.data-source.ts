import { Injectable } from '@nestjs/common';
import { WorkloadService } from '../../project/workload.service';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { STAGE_STATUS_SEGMENTS, paletteColor } from '../report-theme';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

/**
 * Per-user workload/utilisation. Reuses the existing WorkloadService aggregation
 * (the stages each user is responsible for, bucketed by planned/actual window).
 */
@Injectable()
export class WorkloadDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.Workload;
  readonly label = 'Workload / Utilisation';
  readonly params: ReportParamField[] = [
    { name: 'from', label: 'From date', type: 'date', required: false },
    { name: 'to', label: 'To date', type: 'date', required: false },
  ];

  constructor(private readonly workload: WorkloadService) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const from = params.from ? String(params.from) : undefined;
    const to = params.to ? String(params.to) : undefined;
    const users = await this.workload.getWorkload(from, to);

    const itemCount = users.reduce((acc, u) => acc + u.items.length, 0);

    // Status distribution across every assigned item (donut).
    let completed = 0;
    let inProgress = 0;
    let pending = 0;
    for (const u of users) {
      for (const it of u.items) {
        if (it.status === 'completed') completed += 1;
        else if (it.status === 'in_progress') inProgress += 1;
        else pending += 1;
      }
    }

    // Busiest people by assigned-item count (bar chart, top 10). `pct` is the
    // bar width relative to the busiest person (precomputed so the template
    // does not need cross-scope access to the max).
    const ranked = users
      .map((u) => ({ label: u.userName, value: u.items.length }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    const maxLoad = ranked.reduce((m, r) => Math.max(m, r.value), 0);
    const userLoad = ranked.map((row, i) => ({
      ...row,
      pct: maxLoad > 0 ? (row.value / maxLoad) * 100 : 0,
      color: paletteColor(i),
    }));

    return {
      generatedAt: new Date().toISOString(),
      // Human label used to build the generated file name.
      subject:
        from && to
          ? `${from} - ${to}`
          : from
            ? `${from} sonrasi`
            : to
              ? `${to} oncesi`
              : 'Tum Zamanlar',
      from: from ?? null,
      to: to ?? null,
      summary: {
        userCount: users.length,
        itemCount,
        completed,
        inProgress,
        pending,
      },
      charts: {
        statusDist: STAGE_STATUS_SEGMENTS(completed, inProgress, pending),
        userLoad,
        maxLoad,
      },
      users,
    };
  }
}

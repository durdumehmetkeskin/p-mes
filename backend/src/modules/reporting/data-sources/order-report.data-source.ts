import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocationDataService } from '../../location/location-data.service';
import { LocationsService } from '../../location/locations.service';
import { SectionReservationsService } from '../../location/section-reservations.service';
import { Order } from '../../project/entities/order.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { Process } from '../../project/entities/process.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { STAGE_STATUS_SEGMENTS } from '../report-theme';
import {
  buildSeriesChart,
  endOfDayIso,
  seriesPoints,
} from '../report-geometry';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

const TEMP_COLOR = '#ef4444';
const HUMIDITY_COLOR = '#0ea5e9';

function elapsedHours(
  start: Date | null | undefined,
  end: Date | null | undefined,
): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 3_600_000) * 10) / 10;
}

/**
 * Detailed work-order report ("Sipariş Emri Raporu"). Covers the consumed
 * raw materials (what / how much / when), the temperature & humidity of the
 * locations the order's stages ran in (with line charts), and every process &
 * stage with its assigned personnel and planned-vs-actual timeline.
 */
@Injectable()
export class OrderReportDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.OrderReport;
  readonly label = 'Sipariş Emri Raporu';
  readonly params: ReportParamField[] = [
    { name: 'orderId', label: 'Order', type: 'order', required: true },
  ];

  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Process) private readonly processes: Repository<Process>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    private readonly locationData: LocationDataService,
    private readonly locations: LocationsService,
    private readonly sectionReservations: SectionReservationsService,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const orderId = String(params.orderId ?? '');
    if (!orderId) throw new BadRequestException('orderId is required');

    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException(`Order ${orderId} not found`);

    const processes = await this.processes.find({
      where: { orderItem: { orderId } },
      order: { createdAt: 'ASC' },
    });
    const processIds = processes.map((p) => p.id);
    const stages = processIds.length
      ? await this.stages.find({
          where: { processId: In(processIds) },
          order: { sequence: 'ASC' },
        })
      : [];
    const stageIds = stages.map((s) => s.id);

    const stagesByProcess = new Map<string, ProcessStage[]>();
    for (const s of stages) {
      const list = stagesByProcess.get(s.processId) ?? [];
      list.push(s);
      stagesByProcess.set(s.processId, list);
    }

    let totalStages = 0;
    let completedStages = 0;
    let inProgressStages = 0;
    let pendingStages = 0;
    const processCompletion: Array<{ label: string; value: number }> = [];

    const processViews = processes.map((p, idx) => {
      const ps = stagesByProcess.get(p.id) ?? [];
      let pTotal = 0;
      let pCompleted = 0;
      const stageViews = ps.map((s) => {
        totalStages += 1;
        pTotal += 1;
        if (s.status === 'completed') {
          completedStages += 1;
          pCompleted += 1;
        } else if (s.status === 'in_progress') {
          inProgressStages += 1;
        } else {
          pendingStages += 1;
        }
        return {
          sequence: s.sequence,
          name: s.name,
          stageType: s.stageType?.name ?? null,
          status: s.status,
          responsible:
            (s.workers ?? []).map((w) => w.name).join(', ') || null,
          startedAt: s.startedAt,
          completedAt: s.completedAt,
          estimatedStartDate: s.estimatedStartDate,
          estimatedCompletedDate: s.estimatedCompletedDate,
          estimatedDurationHours: s.estimatedDurationHours,
          durationHours: s.durationHours,
          elapsedHours: elapsedHours(s.startedAt, s.completedAt),
          note: s.note,
        };
      });
      if (pTotal > 0) {
        processCompletion.push({
          label: p.category?.name ?? `Süreç ${idx + 1}`,
          value: (pCompleted / pTotal) * 100,
        });
      }
      return {
        category: p.category?.name ?? null,
        status: p.overallStatus,
        responsible: p.responsibleUser?.name ?? null,
        totalStages: pTotal,
        completedStages: pCompleted,
        completionPct: pTotal ? (pCompleted / pTotal) * 100 : 0,
        startedAt: p.startedAt,
        completedAt: p.completedAt,
        estimatedStartDate: p.estimatedStartDate,
        estimatedCompletedDate: p.estimatedCompletedDate,
        estimatedDurationHours: p.estimatedDurationHours,
        durationHours: p.durationHours,
        elapsedHours: elapsedHours(p.startedAt, p.completedAt),
        stages: stageViews,
      };
    });

    const materials = await this.usedMaterials(stageIds, stages);
    const environment = await this.environment(orderId);

    return {
      generatedAt: new Date().toISOString(),
      subject: order.project?.name
        ? `${order.orderNumber} ${order.project.name}`
        : order.orderNumber,
      order: {
        orderNumber: order.orderNumber,
        name: order.name,
        description: order.description,
        dueDate: order.dueDate,
        status: order.status,
        project: order.project?.name ?? null,
        projectCode: order.project?.code ?? null,
      },
      summary: {
        totalProcesses: processes.length,
        totalStages,
        completedStages,
        inProgressStages,
        pendingStages,
        completionPct: totalStages ? (completedStages / totalStages) * 100 : 0,
        materialLineCount: materials.rows.length,
        materialShortageCount: materials.summary.shortageCount,
        locationCount: environment.length,
      },
      charts: {
        stageStatus: STAGE_STATUS_SEGMENTS(
          completedStages,
          inProgressStages,
          pendingStages,
        ),
        processCompletion: processCompletion.slice(0, 8),
      },
      processes: processViews,
      materials: materials.rows,
      materialsSummary: materials.summary,
      environment,
    };
  }

  /** Raw materials the order consumes: MRP + BOM lines across its stages. */
  private async usedMaterials(
    stageIds: string[],
    stages: ProcessStage[],
  ): Promise<{
    rows: Array<Record<string, unknown>>;
    summary: { shortageCount: number; totalRequired: number };
  }> {
    if (stageIds.length === 0) {
      return { rows: [], summary: { shortageCount: 0, totalRequired: 0 } };
    }
    const stageName = new Map(stages.map((s) => [s.id, s.name]));
    // The MRP/BOM detail tables were removed (generic-only stage types);
    // no source rows remain, so this report section renders empty.
    const mrp: Array<{
      itemCode: string | null;
      itemName: string;
      unit: string | null;
      requiredQuantity: number | null;
      shortageQuantity: number | null;
      availableQuantity: number | null;
      requiredDate: string | null;
      processStageId: string;
    }> = [];
    const bom: Array<{
      itemCode: string | null;
      itemName: string;
      unit: string | null;
      quantity: number | null;
      processStageId: string;
    }> = [];
    await Promise.resolve();

    let shortageCount = 0;
    let totalRequired = 0;
    const rows = [
      ...mrp.map((l) => {
        const shortage = Number(l.shortageQuantity ?? 0);
        if (shortage > 0) shortageCount += 1;
        totalRequired += Number(l.requiredQuantity ?? 0);
        return {
          kind: 'İhtiyaç',
          code: l.itemCode,
          name: l.itemName,
          quantity: l.requiredQuantity,
          unit: l.unit,
          date: l.requiredDate,
          available: l.availableQuantity,
          shortage,
          stage: stageName.get(l.processStageId) ?? null,
        };
      }),
      ...bom.map((l) => {
        totalRequired += Number(l.quantity ?? 0);
        return {
          kind: 'Reçete',
          code: l.itemCode,
          name: l.itemName,
          quantity: l.quantity,
          unit: l.unit,
          date: null as string | null,
          available: null as number | null,
          shortage: 0,
          stage: stageName.get(l.processStageId) ?? null,
        };
      }),
    ].sort((a, b) => {
      const ad = a.date ? new Date(a.date).getTime() : Infinity;
      const bd = b.date ? new Date(b.date).getTime() : Infinity;
      return ad - bd || String(a.name).localeCompare(String(b.name), 'tr');
    });

    return { rows, summary: { shortageCount, totalRequired } };
  }

  /** Per-reservation environment: temp/humidity series + charts of the
   * locations where the order's stages ran. */
  private async environment(
    orderId: string,
  ): Promise<Array<Record<string, unknown>>> {
    const [reservations] = await this.sectionReservations.findPaginated({
      skip: 0,
      take: 200,
      sort: 'startDate',
      order: 'ASC',
      orderId,
    });

    // Resolve location names once (the reservation only carries section.locationId).
    const locationNames = new Map<string, string>();
    for (const id of new Set(
      reservations
        .map((r) => r.section?.locationId)
        .filter((id): id is string => !!id),
    )) {
      const loc = await this.locations.findOne(id).catch(() => null);
      if (loc) locationNames.set(id, `${loc.code} · ${loc.name}`);
    }

    const blocks = await Promise.all(
      reservations.map(async (r) => {
        const locationId = r.section?.locationId;
        if (!locationId) return null;
        const series = await this.locationData.getSeries(locationId, {
          from: r.startDate,
          // getSeries is half-open (recorded_at < to); extend a date-only end
          // to end-of-day so the reservation's final day is included and a
          // single-day reservation isn't collapsed to an empty window.
          to: endOfDayIso(r.endDate),
          maxPoints: 600,
        });
        const tempChart = buildSeriesChart(
          seriesPoints(series.series, 'temp'),
          TEMP_COLOR,
        );
        const humidityChart = buildSeriesChart(
          seriesPoints(series.series, 'humidity'),
          HUMIDITY_COLOR,
        );
        return {
          locationName: locationNames.get(locationId) ?? null,
          sectionCode: r.section?.code ?? null,
          sectionName: r.section?.name ?? null,
          from: r.startDate,
          to: r.endDate,
          readingCount: series.summary.count,
          tempMin: series.summary.tempMin,
          tempAvg: series.summary.tempAvg,
          tempMax: series.summary.tempMax,
          humidityMin: series.summary.humidityMin,
          humidityAvg: series.summary.humidityAvg,
          humidityMax: series.summary.humidityMax,
          tempChart,
          humidityChart,
        };
      }),
    );
    return blocks.filter((b): b is NonNullable<typeof b> => b !== null);
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { LocationDataService } from '../../location/location-data.service';
import { LocationsService } from '../../location/locations.service';
import { SectionReservationsService } from '../../location/section-reservations.service';
import { SectionsService } from '../../location/sections.service';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { Process } from '../../project/entities/process.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { COLOR } from '../report-theme';
import {
  buildSeriesChart,
  buildTimeline,
  capTimeline,
  endOfDayIso,
  seriesPoints,
} from '../report-geometry';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

const TEMP_COLOR = '#ef4444';
const HUMIDITY_COLOR = '#0ea5e9';

type ResStatus = 'active' | 'upcoming' | 'past';
const RES_META: Record<ResStatus, { label: string; color: string }> = {
  active: { label: 'Aktif', color: '#f59e0b' },
  upcoming: { label: 'Yaklaşan', color: '#2563eb' },
  past: { label: 'Geçmiş', color: '#94a3b8' },
};

/**
 * Detailed location report ("Lokasyon Raporu"): the temperature & humidity of
 * the location over a chosen date range (with line charts) and a calendar /
 * Gantt of the reservations and the orders' operations that ran there.
 */
@Injectable()
export class LocationReportDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.LocationReport;
  readonly label = 'Lokasyon Raporu';
  readonly params: ReportParamField[] = [
    { name: 'locationId', label: 'Location', type: 'location', required: true },
    { name: 'from', label: 'From date', type: 'date', required: false },
    { name: 'to', label: 'To date', type: 'date', required: false },
  ];

  constructor(
    private readonly locations: LocationsService,
    private readonly sections: SectionsService,
    private readonly reservations: SectionReservationsService,
    private readonly locationData: LocationDataService,
    @InjectRepository(Process) private readonly processes: Repository<Process>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const locationId = String(params.locationId ?? '');
    if (!locationId) throw new BadRequestException('locationId is required');
    const from = params.from ? String(params.from) : undefined;
    const to = params.to ? String(params.to) : undefined;

    const location = await this.locations.findOne(locationId);

    // ---- Environment series + charts ----
    const series = await this.locationData.getSeries(locationId, {
      from,
      // Include the whole selected end-day (getSeries is half-open: < to).
      to: endOfDayIso(to),
      maxPoints: 700,
    });
    const tempChart = buildSeriesChart(
      seriesPoints(series.series, 'temp'),
      TEMP_COLOR,
    );
    const humidityChart = buildSeriesChart(
      seriesPoints(series.series, 'humidity'),
      HUMIDITY_COLOR,
    );

    // Resolve the calendar window: explicit params, else the series range.
    const windowFrom = from ?? series.from ?? null;
    const windowTo = to ?? series.to ?? null;

    // ---- Sections (occupancy today) ----
    const [sectionRows] = await this.sections.findPaginated({
      skip: 0,
      take: 1000,
      sort: 'code',
      order: 'ASC',
      locationId,
    });

    // ---- Reservations within the window ----
    const [allReservations] = await this.reservations.findPaginated({
      skip: 0,
      take: 1000,
      sort: 'startDate',
      order: 'ASC',
      locationId,
    });
    const overlaps = (s: string, e: string) =>
      (!windowTo || s <= windowTo.slice(0, 10)) &&
      (!windowFrom || e >= windowFrom.slice(0, 10));
    const reservationRows = allReservations.filter((r) =>
      overlaps(r.startDate, r.endDate),
    );

    const today = new Date().toISOString().slice(0, 10);
    const classify = (s: string, e: string): ResStatus =>
      s <= today && e >= today ? 'active' : s > today ? 'upcoming' : 'past';

    let active = 0;
    let upcoming = 0;
    let past = 0;
    const occupiedSections = new Set<string>();

    // ---- Operations of the reserved orders (for the calendar detail) ----
    const orderIds = [...new Set(reservationRows.map((r) => r.orderId))];
    const opsByOrder = await this.operationsByOrder(orderIds);

    const reservationViews = reservationRows.map((r) => {
      const status = classify(r.startDate, r.endDate);
      if (status === 'active') {
        active += 1;
        occupiedSections.add(r.sectionId);
      } else if (status === 'upcoming') upcoming += 1;
      else past += 1;
      const ops = opsByOrder.get(r.orderId);
      return {
        id: r.id,
        orderNumber: r.order?.orderNumber ?? null,
        orderName: r.order?.name ?? null,
        section: r.section?.code ?? null,
        sectionName: r.section?.name ?? null,
        startDate: r.startDate,
        endDate: r.endDate,
        note: r.note,
        status,
        pillLabel: RES_META[status].label,
        pillColor: RES_META[status].color,
        operationCount: ops?.total ?? 0,
        completedOperations: ops?.completed ?? 0,
        activeOperation: ops?.active ?? null,
      };
    });

    // Gantt timeline rows (grouped/labelled by section + order).
    const timeline = capTimeline(
      buildTimeline(
        reservationViews.map((r) => ({
          id: r.id,
          label: r.section ?? '—',
          sublabel: r.orderNumber,
          start: r.startDate,
          end: r.endDate,
          color: r.pillColor,
          meta: { status: r.status, orderName: r.orderName },
        })),
        windowFrom,
        windowTo,
      ),
    );

    const occupiedCount = occupiedSections.size;
    const freeCount = Math.max(sectionRows.length - occupiedCount, 0);

    const recentReadings = (
      await this.locationData.getReadings(locationId, from, to)
    ).readings
      .slice(-12)
      .reverse()
      .map((r) => ({
        recordedAt: r.recordedAt,
        temperature: r.temperature,
        humidity: r.humidity,
      }));

    return {
      generatedAt: new Date().toISOString(),
      subject:
        from || to
          ? `${location.code} ${location.name} ${from ?? ''}-${to ?? ''}`
          : `${location.code} ${location.name}`,
      location: {
        code: location.code,
        name: location.name,
        description: location.description,
        isActive: location.isActive,
      },
      window: {
        from: from ?? null,
        to: to ?? null,
        resolvedFrom: windowFrom,
        resolvedTo: windowTo,
      },
      summary: {
        readingCount: series.summary.count,
        bucketSeconds: series.bucketSeconds,
        tempMin: series.summary.tempMin,
        tempAvg: series.summary.tempAvg,
        tempMax: series.summary.tempMax,
        humidityMin: series.summary.humidityMin,
        humidityAvg: series.summary.humidityAvg,
        humidityMax: series.summary.humidityMax,
        sectionCount: sectionRows.length,
        occupiedCount,
        freeCount,
        reservationCount: reservationViews.length,
        activeReservations: active,
        upcomingReservations: upcoming,
        pastReservations: past,
      },
      charts: {
        sectionOccupancy: [
          { label: 'Dolu', value: occupiedCount, color: COLOR.low },
          { label: 'Boş', value: freeCount, color: COLOR.ok },
        ],
        reservationStatus: [
          { label: 'Aktif', value: active, color: RES_META.active.color },
          {
            label: 'Yaklaşan',
            value: upcoming,
            color: RES_META.upcoming.color,
          },
          { label: 'Geçmiş', value: past, color: RES_META.past.color },
        ],
      },
      tempChart,
      humidityChart,
      timeline,
      reservations: reservationViews,
      readings: recentReadings,
    };
  }

  /** Stage/operation rollup per order (count + active stage) for the calendar. */
  private async operationsByOrder(
    orderIds: string[],
  ): Promise<
    Map<string, { total: number; completed: number; active: string | null }>
  > {
    const result = new Map<
      string,
      { total: number; completed: number; active: string | null }
    >();
    if (orderIds.length === 0) return result;

    const processes = await this.processes.find({
      where: { orderItem: { orderId: In(orderIds) } },
    });
    const processToOrder = new Map(
      processes.map((p) => [p.id, p.orderItem.orderId]),
    );
    const processIds = processes.map((p) => p.id);
    if (processIds.length === 0) return result;

    const stages = await this.stages.find({
      where: { processId: In(processIds) },
      order: { sequence: 'ASC' },
    });
    for (const s of stages) {
      const orderId = processToOrder.get(s.processId);
      if (!orderId) continue;
      const acc = result.get(orderId) ?? {
        total: 0,
        completed: 0,
        active: null,
      };
      acc.total += 1;
      if (s.status === 'completed') acc.completed += 1;
      if (s.status === 'in_progress' && !acc.active) acc.active = s.name;
      result.set(orderId, acc);
    }
    // Fall back to the first pending stage when nothing is in progress.
    for (const [orderId, acc] of result) {
      if (!acc.active && acc.completed < acc.total) {
        const next = stages.find(
          (s) =>
            processToOrder.get(s.processId) === orderId &&
            s.status === 'pending',
        );
        acc.active = next?.name ?? null;
      }
    }
    return result;
  }
}

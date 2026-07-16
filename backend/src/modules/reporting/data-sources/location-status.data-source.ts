import { BadRequestException, Injectable } from '@nestjs/common';
import { LocationDataService } from '../../location/location-data.service';
import { LocationsService } from '../../location/locations.service';
import { SectionReservationsService } from '../../location/section-reservations.service';
import { SectionsService } from '../../location/sections.service';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { COLOR } from '../report-theme';
import {
  ReportDataSourceProvider,
  ReportParamField,
} from './report-data-source.interface';

// A reservation's status relative to "today", derived from its date range
// (the domain stores no status column — occupancy is implicit in overlap).
type ResStatus = 'active' | 'upcoming' | 'past';
const RES_META: Record<ResStatus, { label: string; color: string }> = {
  active: { label: 'Aktif', color: '#f59e0b' },
  upcoming: { label: 'Yaklaşan', color: '#2563eb' },
  past: { label: 'Geçmiş', color: '#94a3b8' },
};

/**
 * A single location's detailed status: its sections (with current occupied/free
 * state), reservations (active/upcoming/past vs today), the linked orders and a
 * summary of the sensor environment (temperature/humidity) plus the data files
 * the readings came from. Composes the location module's services.
 */
@Injectable()
export class LocationStatusDataSource implements ReportDataSourceProvider {
  readonly key = ReportDataSource.LocationStatus;
  readonly label = 'Location Status';
  readonly params: ReportParamField[] = [
    { name: 'locationId', label: 'Location', type: 'location', required: true },
    { name: 'from', label: 'Readings from', type: 'date', required: false },
    { name: 'to', label: 'Readings to', type: 'date', required: false },
  ];

  constructor(
    private readonly locations: LocationsService,
    private readonly sections: SectionsService,
    private readonly reservations: SectionReservationsService,
    private readonly locationData: LocationDataService,
  ) {}

  async run(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const locationId = String(params.locationId ?? '');
    if (!locationId) {
      throw new BadRequestException('locationId is required');
    }
    const from = params.from ? String(params.from) : undefined;
    const to = params.to ? String(params.to) : undefined;

    // findOne throws NotFound if the location does not exist.
    const location = await this.locations.findOne(locationId);

    const [sectionRows] = await this.sections.findPaginated({
      skip: 0,
      take: 1000,
      sort: 'code',
      order: 'ASC',
      locationId,
    });
    const [reservationRows] = await this.reservations.findPaginated({
      skip: 0,
      take: 1000,
      sort: 'startDate',
      order: 'DESC',
      locationId,
    });
    const { summary, readings } = await this.locationData.getReadings(
      locationId,
      from,
      to,
    );
    const range = await this.locationData.getRange(locationId);
    const files = await this.locationData.listFiles(locationId);

    const today = new Date().toISOString().slice(0, 10);

    // Classify each reservation and remember which section is occupied today
    // (and by which order) for the section table.
    const occupiedBySection = new Map<string, string>();
    let active = 0;
    let upcoming = 0;
    let past = 0;
    const reservationViews = reservationRows.map((r) => {
      let status: ResStatus;
      if (r.startDate <= today && r.endDate >= today) {
        status = 'active';
        active += 1;
        occupiedBySection.set(
          r.sectionId,
          r.order?.orderNumber ?? r.order?.name ?? '—',
        );
      } else if (r.startDate > today) {
        status = 'upcoming';
        upcoming += 1;
      } else {
        status = 'past';
        past += 1;
      }
      return {
        orderNumber: r.order?.orderNumber ?? null,
        orderName: r.order?.name ?? null,
        section: r.section?.code ?? null,
        sectionName: r.section?.name ?? null,
        startDate: r.startDate,
        endDate: r.endDate,
        note: r.note,
        status,
        // Named pill* (not status*) to avoid colliding with the statusLabel/
        // statusColor Handlebars helpers, which would shadow these fields.
        pillLabel: RES_META[status].label,
        pillColor: RES_META[status].color,
      };
    });

    const sectionViews = sectionRows.map((s) => {
      const order = occupiedBySection.get(s.id) ?? null;
      const occupied = order !== null;
      return {
        code: s.code,
        name: s.name,
        isActive: s.isActive,
        occupied,
        currentOrder: order,
        pillLabel: occupied ? 'Dolu' : 'Boş',
        pillColor: occupied ? COLOR.low : COLOR.ok,
      };
    });

    const occupiedCount = occupiedBySection.size;
    const freeCount = Math.max(sectionViews.length - occupiedCount, 0);

    // Recent readings (the fetched set is ASC-capped at 5000; show the tail).
    const recentReadings = readings
      .slice(-15)
      .reverse()
      .map((r) => ({
        recordedAt: r.recordedAt,
        temperature: r.temperature,
        humidity: r.humidity,
      }));

    return {
      generatedAt: new Date().toISOString(),
      subject: `${location.code} ${location.name}`.trim(),
      location: {
        code: location.code,
        name: location.name,
        description: location.description,
        isActive: location.isActive,
      },
      window: { from: from ?? null, to: to ?? null },
      summary: {
        sectionCount: sectionViews.length,
        occupiedCount,
        freeCount,
        reservationCount: reservationViews.length,
        activeReservations: active,
        upcomingReservations: upcoming,
        pastReservations: past,
        readingCount: summary.count,
        totalReadingCount: range.count,
        firstReadingAt: range.min,
        lastReadingAt: range.max,
        fileCount: files.length,
        tempMin: summary.tempMin,
        tempAvg: summary.tempAvg,
        tempMax: summary.tempMax,
        humidityMin: summary.humidityMin,
        humidityAvg: summary.humidityAvg,
        humidityMax: summary.humidityMax,
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
      sections: sectionViews,
      reservations: reservationViews,
      readings: recentReadings,
      files: files.map((f) => ({
        fileName: f.fileName,
        readingCount: f.readingCount,
        startTime: f.startTime,
        endTime: f.endTime,
        size: f.size,
      })),
    };
  }
}

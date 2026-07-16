import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { DataSource, Repository } from 'typeorm';
import { MinioService } from '../storage/minio.service';
import { LocationDataFile } from './entities/location-data-file.entity';
import { LocationReading } from './entities/location-reading.entity';
import { Location } from './entities/location.entity';
import { SectionReservation } from './entities/section-reservation.entity';
import { parseSensorXls } from './sensor-xls.parser';

export interface ReadingSummary {
  count: number;
  tempMin: number | null;
  tempMax: number | null;
  tempAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
  humidityAvg: number | null;
}

export interface SeriesBucket {
  t: number; // bucket start, epoch ms
  count: number;
  tempAvg: number | null;
  tempMin: number | null;
  tempMax: number | null;
  humidityAvg: number | null;
  humidityMin: number | null;
  humidityMax: number | null;
}

export interface SeriesResponse {
  bucketSeconds: number;
  from: string | null;
  to: string | null;
  pointCount: number;
  summary: ReadingSummary;
  series: SeriesBucket[];
}

export interface ReadingsRange {
  min: string | null;
  max: string | null;
  count: number;
}

// "Nice" bucket sizes (seconds): 1s … 1 day.
const NICE_BUCKETS = [1, 5, 10, 30, 60, 300, 900, 1800, 3600, 21600, 86400];
const SERIES_HARD_CAP = 50_000;

function pickNiceBucket(spanSec: number, maxPoints: number): number {
  const ideal = spanSec / Math.max(1, maxPoints);
  return NICE_BUCKETS.find((b) => b >= ideal) ?? 86400;
}

function toIso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

@Injectable()
export class LocationDataService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly minio: MinioService,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    @InjectRepository(LocationDataFile)
    private readonly files: Repository<LocationDataFile>,
    @InjectRepository(LocationReading)
    private readonly readings: Repository<LocationReading>,
    @InjectRepository(SectionReservation)
    private readonly reservations: Repository<SectionReservation>,
  ) {}

  async upload(
    locationId: string,
    file: Express.Multer.File | undefined,
    uploadedById: string | null,
  ): Promise<LocationDataFile> {
    if (!file) throw new BadRequestException('A data file is required.');
    const location = await this.locations.findOne({
      where: { id: locationId },
    });
    if (!location)
      throw new NotFoundException(`Location ${locationId} not found`);

    const parsed = parseSensorXls(file.buffer);
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const objectKey = `locations/${locationId}/${randomUUID()}`;
    await this.minio.put(objectKey, file.buffer, file.mimetype);

    const id = await this.dataSource.transaction(async (manager) => {
      const dataFile = await manager.save(
        manager.create(LocationDataFile, {
          locationId,
          fileName,
          objectKey,
          contentType: file.mimetype,
          size: file.size,
          readingCount: parsed.readings.length,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          uploadedById,
        }),
      );
      const rows = parsed.readings.map((r) => ({
        locationId,
        dataFileId: dataFile.id,
        recordedAt: r.recordedAt,
        temperature: r.temperature,
        humidity: r.humidity,
      }));
      // Chunked insert keeps the statement size sane for large files.
      for (let i = 0; i < rows.length; i += 500) {
        await manager.insert(LocationReading, rows.slice(i, i + 500));
      }
      return dataFile.id;
    });

    return this.files.findOneOrFail({ where: { id } });
  }

  listFiles(locationId: string): Promise<LocationDataFile[]> {
    return this.files.find({
      where: { locationId },
      order: { createdAt: 'DESC' },
    });
  }

  async downloadFile(
    id: string,
  ): Promise<{ file: LocationDataFile; stream: Readable }> {
    const file = await this.files.findOne({ where: { id } });
    if (!file) throw new NotFoundException(`Data file ${id} not found`);
    const stream = await this.minio.getStream(file.objectKey);
    return { file, stream };
  }

  async deleteFile(id: string): Promise<void> {
    const file = await this.files.findOne({ where: { id } });
    if (!file) throw new NotFoundException(`Data file ${id} not found`);
    await this.minio.remove(file.objectKey).catch(() => undefined);
    // Readings cascade via FK.
    await this.files.delete(id);
  }

  /** Readings + summary for a location, optionally limited to a date range. */
  async getReadings(
    locationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ summary: ReadingSummary; readings: LocationReading[] }> {
    const summary = await this.summarize(locationId, startDate, endDate);
    const qb = this.readings
      .createQueryBuilder('r')
      .where('r.location_id = :locationId', { locationId })
      .orderBy('r.recorded_at', 'ASC')
      .take(5000);
    this.applyDateRange(qb, startDate, endDate);
    const readings = await qb.getMany();
    return { summary, readings };
  }

  /** Overall recorded-at bounds + count (drives the chart's range picker). */
  async getRange(locationId: string): Promise<ReadingsRange> {
    const raw = await this.readings
      .createQueryBuilder('r')
      .select('MIN(r.recorded_at)', 'min')
      .addSelect('MAX(r.recorded_at)', 'max')
      .addSelect('COUNT(*)', 'count')
      .where('r.location_id = :locationId', { locationId })
      .getRawOne<{
        min: Date | string | null;
        max: Date | string | null;
        count: string;
      }>();
    return {
      min: toIso(raw?.min ?? null),
      max: toIso(raw?.max ?? null),
      count: Number(raw?.count ?? 0),
    };
  }

  /**
   * Server-side downsampled series: groups readings into time buckets and
   * returns avg/min/max per bucket. The bucket size adapts to the range so the
   * payload stays bounded regardless of how many raw rows exist.
   */
  async getSeries(
    locationId: string,
    opts: {
      from?: string;
      to?: string;
      bucketSeconds?: number;
      maxPoints?: number;
    },
  ): Promise<SeriesResponse> {
    // Resolve range (fall back to the full data range).
    let fromIso = opts.from ?? null;
    let toIso2 = opts.to ?? null;
    if (!fromIso || !toIso2) {
      const range = await this.getRange(locationId);
      fromIso = fromIso ?? range.min;
      toIso2 = toIso2 ?? range.max;
    }
    if (!fromIso || !toIso2) {
      return {
        bucketSeconds: 1,
        from: fromIso,
        to: toIso2,
        pointCount: 0,
        summary: await this.summarize(locationId),
        series: [],
      };
    }
    const fromMs = new Date(fromIso).getTime();
    let toMs = new Date(toIso2).getTime();
    if (!(toMs > fromMs)) toMs = fromMs + 1000; // guard inverted/zero ranges
    const spanSec = Math.max(1, (toMs - fromMs) / 1000);
    const maxPoints = opts.maxPoints ?? 1800;

    // Pick the bucket: explicit override (snapped) or auto from the span.
    let bucketSeconds = opts.bucketSeconds
      ? (NICE_BUCKETS.find((b) => b >= opts.bucketSeconds!) ?? 86400)
      : pickNiceBucket(spanSec, maxPoints);
    // Never let an override blow past the hard cap.
    if (spanSec / bucketSeconds > SERIES_HARD_CAP) {
      bucketSeconds = pickNiceBucket(spanSec, SERIES_HARD_CAP);
    }

    const bucketExpr =
      'to_timestamp(floor(extract(epoch from r.recorded_at) / :bucketSec) * :bucketSec)';
    const rows = await this.readings
      .createQueryBuilder('r')
      .select(bucketExpr, 'bucket')
      .addSelect('count(*)', 'count')
      .addSelect('avg(r.temperature)', 'temp_avg')
      .addSelect('min(r.temperature)', 'temp_min')
      .addSelect('max(r.temperature)', 'temp_max')
      .addSelect('avg(r.humidity)', 'hum_avg')
      .addSelect('min(r.humidity)', 'hum_min')
      .addSelect('max(r.humidity)', 'hum_max')
      .where('r.location_id = :locationId', { locationId })
      .andWhere('r.recorded_at >= :from', { from: new Date(fromMs) })
      .andWhere('r.recorded_at < :to', { to: new Date(toMs) })
      .setParameter('bucketSec', bucketSeconds)
      .groupBy(bucketExpr)
      .orderBy('bucket', 'ASC')
      .getRawMany<{
        bucket: Date | string;
        count: string;
        temp_avg: string | null;
        temp_min: string | null;
        temp_max: string | null;
        hum_avg: string | null;
        hum_min: string | null;
        hum_max: string | null;
      }>();

    const num = (v: string | null) =>
      v == null ? null : Math.round(Number(v) * 100) / 100;
    const series: SeriesBucket[] = rows.map((row) => ({
      t: new Date(row.bucket).getTime(),
      count: Number(row.count),
      tempAvg: num(row.temp_avg),
      tempMin: num(row.temp_min),
      tempMax: num(row.temp_max),
      humidityAvg: num(row.hum_avg),
      humidityMin: num(row.hum_min),
      humidityMax: num(row.hum_max),
    }));

    return {
      bucketSeconds,
      from: new Date(fromMs).toISOString(),
      to: new Date(toMs).toISOString(),
      pointCount: series.length,
      summary: await this.summarizeRange(locationId, fromMs, toMs),
      series,
    };
  }

  /** Summary over a half-open timestamp range (index-friendly, no ::date cast). */
  private async summarizeRange(
    locationId: string,
    fromMs: number,
    toMs: number,
  ): Promise<ReadingSummary> {
    const raw = await this.readings
      .createQueryBuilder('r')
      .select('COUNT(*)', 'count')
      .addSelect('MIN(r.temperature)', 'tempMin')
      .addSelect('MAX(r.temperature)', 'tempMax')
      .addSelect('AVG(r.temperature)', 'tempAvg')
      .addSelect('MIN(r.humidity)', 'humidityMin')
      .addSelect('MAX(r.humidity)', 'humidityMax')
      .addSelect('AVG(r.humidity)', 'humidityAvg')
      .where('r.location_id = :locationId', { locationId })
      .andWhere('r.recorded_at >= :from', { from: new Date(fromMs) })
      .andWhere('r.recorded_at < :to', { to: new Date(toMs) })
      .getRawOne<Record<string, string | null>>();
    const num = (v: string | null | undefined) =>
      v == null ? null : Math.round(Number(v) * 100) / 100;
    return {
      count: Number(raw?.count ?? 0),
      tempMin: num(raw?.tempMin),
      tempMax: num(raw?.tempMax),
      tempAvg: num(raw?.tempAvg),
      humidityMin: num(raw?.humidityMin),
      humidityMax: num(raw?.humidityMax),
      humidityAvg: num(raw?.humidityAvg),
    };
  }

  /** Production conditions for a single reservation (section's location, range). */
  async conditionsForReservation(reservationId: string): Promise<{
    reservation: SectionReservation;
    summary: ReadingSummary;
    readings: LocationReading[];
  }> {
    const reservation = await this.reservations.findOne({
      where: { id: reservationId },
    });
    if (!reservation) {
      throw new NotFoundException(`Reservation ${reservationId} not found`);
    }
    const locationId = reservation.section.locationId;
    const { summary, readings } = await this.getReadings(
      locationId,
      reservation.startDate,
      reservation.endDate,
    );
    return { reservation, summary, readings };
  }

  /** Conditions per reservation of an order (traceability). */
  async conditionsForOrder(
    orderId: string,
  ): Promise<
    Array<{ reservation: SectionReservation; summary: ReadingSummary }>
  > {
    const reservations = await this.reservations.find({
      where: { orderId },
      order: { startDate: 'ASC' },
    });
    return Promise.all(
      reservations.map(async (reservation) => ({
        reservation,
        summary: await this.summarize(
          reservation.section.locationId,
          reservation.startDate,
          reservation.endDate,
        ),
      })),
    );
  }

  private applyDateRange(
    qb: ReturnType<Repository<LocationReading>['createQueryBuilder']>,
    startDate?: string,
    endDate?: string,
  ): void {
    if (startDate) {
      qb.andWhere('r.recorded_at::date >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('r.recorded_at::date <= :endDate', { endDate });
    }
  }

  private async summarize(
    locationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<ReadingSummary> {
    const qb = this.readings
      .createQueryBuilder('r')
      .select('COUNT(*)', 'count')
      .addSelect('MIN(r.temperature)', 'tempMin')
      .addSelect('MAX(r.temperature)', 'tempMax')
      .addSelect('AVG(r.temperature)', 'tempAvg')
      .addSelect('MIN(r.humidity)', 'humidityMin')
      .addSelect('MAX(r.humidity)', 'humidityMax')
      .addSelect('AVG(r.humidity)', 'humidityAvg')
      .where('r.location_id = :locationId', { locationId });
    this.applyDateRange(qb, startDate, endDate);
    const raw = await qb.getRawOne<Record<string, string | null>>();
    const num = (v: string | null | undefined) =>
      v == null ? null : Math.round(Number(v) * 100) / 100;
    return {
      count: Number(raw?.count ?? 0),
      tempMin: num(raw?.tempMin),
      tempMax: num(raw?.tempMax),
      tempAvg: num(raw?.tempAvg),
      humidityMin: num(raw?.humidityMin),
      humidityMax: num(raw?.humidityMax),
      humidityAvg: num(raw?.humidityAvg),
    };
  }
}

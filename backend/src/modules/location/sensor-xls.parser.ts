import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ParsedReading {
  recordedAt: Date;
  temperature: number;
  humidity: number;
}

export interface ParsedSensorData {
  readings: ParsedReading[];
  startTime: Date | null;
  endTime: Date | null;
}

/** "20-10-07/14:04:01" (YY-MM-DD/HH:MM:SS) → Date (treated as UTC). */
function parseTime(value: string): Date | null {
  const m = value
    .trim()
    .match(/^(\d{2})-(\d{2})-(\d{2})\/(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const [, yy, mm, dd, hh, mi, ss] = m.map(Number);
  const d = new Date(Date.UTC(2000 + yy, mm - 1, dd, hh, mi, ss));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parses a sensor "Test Report" .xls (NO / Temp(C) / RH(%RH) / TIME columns)
 * into temperature/humidity readings.
 */
export function parseSensorXls(buffer: Buffer): ParsedSensorData {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new BadRequestException('Could not read the data file.');
  }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
  });

  const headerIndex = rows.findIndex(
    (r) =>
      String(r?.[0] ?? '')
        .trim()
        .toUpperCase() === 'NO',
  );
  if (headerIndex === -1) {
    throw new BadRequestException(
      'Unrecognised file format (missing NO/Temp/RH/TIME header).',
    );
  }

  const readings: ParsedReading[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length < 4) continue;
    const temperature = Number(row[1]);
    const humidity = Number(row[2]);
    const recordedAt = parseTime(String(row[3] ?? ''));
    if (!recordedAt || Number.isNaN(temperature) || Number.isNaN(humidity)) {
      continue;
    }
    readings.push({ recordedAt, temperature, humidity });
  }

  if (readings.length === 0) {
    throw new BadRequestException('No readings found in the file.');
  }

  const times = readings.map((r) => r.recordedAt.getTime());
  return {
    readings,
    startTime: new Date(Math.min(...times)),
    endTime: new Date(Math.max(...times)),
  };
}

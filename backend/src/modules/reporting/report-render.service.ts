import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { MinioService } from '../storage/minio.service';
import {
  REPORT_DATA_SOURCES,
  ReportDataSourceProvider,
} from './data-sources/report-data-source.interface';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportDataSource } from './enums/report-data-source.enum';
import {
  FORMAT_TO_RECIPE,
  RECIPE_TO_FORMAT,
  ReportFormat,
} from './enums/report-format.enum';
import { JsReportService } from './jsreport.service';
import { ReportDefinitionsService } from './report-definitions.service';
import { mergeHelpers } from './report-helpers';
import { REPORT_LOGO_DATA_URI } from './templates/report-logo';

// Fallback letterhead for templates that do not place the logo themselves —
// prepended at render time so EVERY report carries the company logo. Styled
// after the system templates' letterhead (logo left, rule underneath), with
// the logo's own navy standing in for the missing theme accent. (The
// html-to-xlsx recipe only extracts tables, so xlsx output cannot carry it.)
const LOGO_FALLBACK_HEADER =
  '<div style="display:flex;align-items:flex-end;justify-content:space-between;' +
  'margin:0 0 16px;padding-bottom:12px;border-bottom:3px solid #22375f;">' +
  '<img src="{{{logoDataUri}}}" alt="Quanta Kompozit A.Ş." style="height:84px;" />' +
  '<div style="text-align:right;font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.4px;">' +
  '<span style="display:block;font-size:11px;font-weight:700;color:#22375f;letter-spacing:2px;">QUA-MES</span>' +
  'Üretim Yönetim Sistemi</div></div>\n';

export interface RenderedReport {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}

@Injectable()
export class ReportRenderService {
  private readonly logger = new Logger(ReportRenderService.name);
  private readonly sources: Map<ReportDataSource, ReportDataSourceProvider>;

  constructor(
    @Inject(REPORT_DATA_SOURCES) sources: ReportDataSourceProvider[],
    private readonly definitions: ReportDefinitionsService,
    private readonly jsreport: JsReportService,
    private readonly minio: MinioService,
    @InjectRepository(GeneratedReport)
    private readonly history: Repository<GeneratedReport>,
  ) {
    this.sources = new Map(sources.map((s) => [s.key, s]));
  }

  /** The available data sources + their parameter schema (drives the UI form). */
  listDataSources(): Array<{
    key: string;
    label: string;
    params: ReportDataSourceProvider['params'];
  }> {
    return [...this.sources.values()].map((s) => ({
      key: s.key,
      label: s.label,
      params: s.params,
    }));
  }

  async render(
    definitionId: string,
    format: ReportFormat | undefined,
    parameters: Record<string, unknown>,
    userId: string | null,
  ): Promise<RenderedReport> {
    const definition = await this.definitions.findOne(definitionId);
    if (!definition.isActive) {
      throw new BadRequestException('This report is not active');
    }

    const source = this.sources.get(definition.dataSource);
    if (!source) {
      throw new BadRequestException(
        `Unknown data source "${definition.dataSource}"`,
      );
    }

    // Every render carries the company logo: templates reference
    // `{{{logoDataUri}}}`; ones that don't get a standard header prepended.
    const data: Record<string, unknown> = {
      ...(await source.run(parameters ?? {})),
      logoDataUri: REPORT_LOGO_DATA_URI,
    };
    const recipe = format ? FORMAT_TO_RECIPE[format] : definition.recipe;
    const content = definition.content.includes('logoDataUri')
      ? definition.content
      : LOGO_FALLBACK_HEADER + definition.content;

    const result = await this.jsreport.render({
      content,
      engine: definition.engine,
      recipe,
      helpers: mergeHelpers(definition.helpers),
      data,
    });

    // Build a descriptive file name: <report key>_<subject>_<date>.<ext>, where
    // the subject (project/order/warehouse/date-range) is supplied by the data
    // source so the user can tell artifacts apart at a glance.
    const subject =
      typeof (data as { subject?: unknown }).subject === 'string'
        ? slugify((data as { subject: string }).subject)
        : '';
    const fileName = [definition.key, subject, this.timestamp()]
      .filter(Boolean)
      .join('_')
      .concat(`.${result.fileExtension}`);

    // Persist the artifact to object storage + a history row (best effort: a
    // storage hiccup must not fail the user's download).
    await this.persist(
      definition.id,
      definition.name,
      RECIPE_TO_FORMAT[recipe],
      parameters ?? null,
      fileName,
      result,
      userId,
    ).catch((err) =>
      this.logger.warn(`Failed to persist generated report: ${err}`),
    );

    return {
      buffer: result.buffer,
      contentType: result.contentType,
      fileName,
    };
  }

  findHistoryPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof GeneratedReport;
    order: 'ASC' | 'DESC';
    definitionId?: string;
    search?: string;
  }): Promise<[GeneratedReport[], number]> {
    const base: FindOptionsWhere<GeneratedReport> = options.definitionId
      ? { definitionId: options.definitionId }
      : {};
    const search = options.search?.trim();
    // When searching, match either the (possibly renamed) file name or the
    // report name — an array of where-clauses is OR'd, each keeping the base
    // (definitionId) filter.
    const where:
      | FindOptionsWhere<GeneratedReport>[]
      | FindOptionsWhere<GeneratedReport> = search
      ? [
          { ...base, fileName: ILike(`%${search}%`) },
          { ...base, definitionName: ILike(`%${search}%`) },
        ]
      : base;
    return this.history.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async getFromHistory(
    id: string,
  ): Promise<{ report: GeneratedReport; stream: Readable }> {
    const report = await this.history.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Generated report ${id} not found`);
    }
    const stream = await this.minio.getStream(report.objectKey);
    return { report, stream };
  }

  /** Rename a generated report (display name only; the stored object is kept). */
  async renameInHistory(id: string, rawName: string): Promise<GeneratedReport> {
    const report = await this.history.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Generated report ${id} not found`);
    }
    const ext = report.fileName.includes('.')
      ? report.fileName.slice(report.fileName.lastIndexOf('.') + 1)
      : report.format;
    // Drop only filesystem-illegal characters; spaces, hyphens and Turkish
    // letters are kept (Content-Disposition encodes the name as UTF-8). Force
    // the original extension so the file stays openable.
    let base = rawName.trim().replace(/[/\\:*?"<>|]/g, '');
    base = base.replace(new RegExp(`\\.${ext}$`, 'i'), '').trim();
    if (!base) {
      throw new BadRequestException('A file name is required');
    }
    report.fileName = `${base.slice(0, 200)}.${ext}`;
    return this.history.save(report);
  }

  /** Delete a generated report: remove the stored object, then the history row. */
  async deleteFromHistory(id: string): Promise<void> {
    const report = await this.history.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException(`Generated report ${id} not found`);
    }
    // Best effort on the object: a storage miss must not block removing the row.
    await this.minio
      .remove(report.objectKey)
      .catch((err) =>
        this.logger.warn(`Failed to remove report object: ${err}`),
      );
    await this.history.remove(report);
  }

  private async persist(
    definitionId: string,
    definitionName: string,
    format: ReportFormat,
    parameters: Record<string, unknown> | null,
    fileName: string,
    result: { buffer: Buffer; contentType: string },
    userId: string | null,
  ): Promise<void> {
    const objectKey = `reports/${definitionId}/${randomUUID()}`;
    await this.minio.put(objectKey, result.buffer, result.contentType);
    const record = this.history.create({
      definitionId,
      definitionName,
      format,
      parameters,
      fileName,
      objectKey,
      contentType: result.contentType,
      size: result.buffer.length,
      generatedById: userId,
    });
    await this.history.save(record);
  }

  // Readable, filename-safe stamp: YYYY-MM-DD_HHmm (local server time).
  private timestamp(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return (
      `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
      `_${p(d.getHours())}${p(d.getMinutes())}`
    );
  }
}

/**
 * Turn a human label (project/warehouse name, date range) into a filename-safe
 * token: Turkish letters are transliterated, runs of other characters collapse
 * to single hyphens.
 */
function slugify(value: string): string {
  const tr: Record<string, string> = {
    ç: 'c',
    Ç: 'C',
    ğ: 'g',
    Ğ: 'G',
    ı: 'i',
    İ: 'I',
    ö: 'o',
    Ö: 'O',
    ş: 's',
    Ş: 'S',
    ü: 'u',
    Ü: 'U',
  };
  return value
    .replace(/[çÇğĞıİöÖşŞüÜ]/g, (c) => tr[c] ?? c)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

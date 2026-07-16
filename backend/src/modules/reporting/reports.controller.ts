import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { ListGeneratedReportsQueryDto } from './dto/list-generated-reports-query.dto';
import { RenameGeneratedReportDto } from './dto/rename-generated-report.dto';
import { RenderReportDto } from './dto/render-report.dto';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportFormat } from './enums/report-format.enum';
import { ReportRenderService } from './report-render.service';

const HISTORY_SORTABLE: ReadonlyArray<keyof GeneratedReport> = [
  'id',
  'definitionName',
  'format',
  'fileName',
  'size',
  'createdAt',
];

function contentDisposition(fileName: string): string {
  return `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly render: ReportRenderService) {}

  @RequirePermissions('reports:read')
  @Get('data-sources')
  @ApiOperation({ summary: 'List report data sources and their parameters' })
  dataSources() {
    return this.render.listDataSources();
  }

  @RequirePermissions('reports:read')
  @Get('history')
  @ApiOperation({ summary: 'List generated reports (paginated)' })
  async history(
    @Query() query: ListGeneratedReportsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GeneratedReport[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = HISTORY_SORTABLE.includes(query._sort as keyof GeneratedReport)
      ? (query._sort as keyof GeneratedReport)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.render.findHistoryPaginated({
      skip,
      take,
      sort,
      order,
      definitionId: query.definitionId,
      search: query.q,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('reports:read')
  @Get('history/:id/download')
  @ApiOperation({ summary: 'Download a previously generated report' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { report, stream } = await this.render.getFromHistory(id);
    res.set({
      'Content-Type': report.contentType,
      'Content-Disposition': contentDisposition(report.fileName),
    });
    return new StreamableFile(stream);
  }

  @RequirePermissions('reports:generate')
  @Patch('history/:id')
  @ApiOperation({ summary: 'Rename a generated report' })
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenameGeneratedReportDto,
  ): Promise<GeneratedReport> {
    return this.render.renameInHistory(id, body.fileName);
  }

  @RequirePermissions('reports:generate')
  @Delete('history/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a generated report (object + history row)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.render.deleteFromHistory(id);
  }

  @RequirePermissions('reports:generate')
  @Post(':id/render')
  @ApiOperation({
    summary: 'Render a report to PDF or Excel and stream it back',
  })
  @ApiQuery({ name: 'format', enum: ReportFormat, required: false })
  async renderReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RenderReportDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
    @Query('format') format?: string,
  ): Promise<StreamableFile> {
    const fmt = this.parseFormat(format);
    const out = await this.render.render(
      id,
      fmt,
      body.parameters ?? {},
      user?.id ?? null,
    );
    res.set({
      'Content-Type': out.contentType,
      'Content-Disposition': contentDisposition(out.fileName),
    });
    return new StreamableFile(out.buffer);
  }

  private parseFormat(value?: string): ReportFormat | undefined {
    if (!value) return undefined;
    if (!Object.values(ReportFormat).includes(value as ReportFormat)) {
      throw new BadRequestException(`Unsupported format "${value}"`);
    }
    return value as ReportFormat;
  }
}

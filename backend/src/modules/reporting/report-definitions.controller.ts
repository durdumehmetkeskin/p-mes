import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateReportDefinitionDto } from './dto/create-report-definition.dto';
import { ListReportDefinitionsQueryDto } from './dto/list-report-definitions-query.dto';
import { UpdateReportDefinitionDto } from './dto/update-report-definition.dto';
import { ReportDefinition } from './entities/report-definition.entity';
import { ReportDefinitionsService } from './report-definitions.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof ReportDefinition> = [
  'id',
  'key',
  'name',
  'dataSource',
  'recipe',
  'isActive',
  'isSystem',
  'createdAt',
  'updatedAt',
];

@ApiTags('report-definitions')
@ApiBearerAuth('access-token')
@Controller('report-definitions')
export class ReportDefinitionsController {
  constructor(private readonly service: ReportDefinitionsService) {}

  @RequirePermissions('reports:create')
  @Post()
  @ApiOperation({ summary: 'Create a report definition (template)' })
  create(@Body() dto: CreateReportDefinitionDto): Promise<ReportDefinition> {
    return this.service.create(dto);
  }

  @RequirePermissions('reports:read')
  @Get()
  @ApiOperation({ summary: 'List report definitions (paginated)' })
  async findAll(
    @Query() query: ListReportDefinitionsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReportDefinition[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof ReportDefinition)
      ? (query._sort as keyof ReportDefinition)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.service.findPaginated({
      skip,
      take,
      sort,
      order,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('reports:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a report definition by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ReportDefinition> {
    return this.service.findOne(id);
  }

  @RequirePermissions('reports:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a report definition (key is immutable)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReportDefinitionDto,
  ): Promise<ReportDefinition> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('reports:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a report definition (system reports are protected)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}

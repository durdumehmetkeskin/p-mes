import {
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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { DuplicateWorkflowTemplateDto } from './dto/duplicate-workflow-template.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof WorkflowTemplate> = [
  'name',
  'isSystemDefault',
  'createdAt',
];

@ApiTags('workflow-templates')
@ApiBearerAuth('access-token')
@Controller('workflow-templates')
export class WorkflowTemplatesController {
  constructor(private readonly service: WorkflowTemplatesService) {}

  @RequirePermissions('workflow-templates:read')
  @Get()
  @ApiOperation({ summary: 'List workflow templates (filter by category)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WorkflowTemplate[]> {
    const opts = resolveListQuery<WorkflowTemplate>(
      query,
      SORTABLE,
      'createdAt',
      'ASC',
    );
    const [items, total] = await this.service.findPaginated({
      ...opts,
      categoryId: query.categoryId,
      projectId: query.projectId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('workflow-templates:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow template with its ordered stages' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<WorkflowTemplate> {
    return this.service.findOneWithStages(id);
  }

  @RequirePermissions('workflow-templates:create')
  @Post()
  @ApiOperation({ summary: 'Create a workflow template (admin only)' })
  create(@Body() dto: CreateWorkflowTemplateDto): Promise<WorkflowTemplate> {
    return this.service.create(dto);
  }

  @RequirePermissions('workflow-templates:create-duplicate')
  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate a template into a new editable one (admin only)',
  })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateWorkflowTemplateDto,
  ): Promise<WorkflowTemplate> {
    return this.service.duplicate(id, dto.projectId);
  }

  @RequirePermissions('workflow-templates:update')
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a template; replaces stages when provided (admin only)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowTemplateDto,
  ): Promise<WorkflowTemplate> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('workflow-templates:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a workflow template (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}

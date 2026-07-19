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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
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

// Every route below is relationship-authorized in the service: only an admin
// or the project's manager may view/edit/delete a project's workflows (the
// manager may lack the workflow-templates:* keys, so guard-level checks would
// lock them out). Global templates (no project) are admin-only.
@ApiTags('workflow-templates')
@ApiBearerAuth('access-token')
@Controller('workflow-templates')
export class WorkflowTemplatesController {
  constructor(private readonly service: WorkflowTemplatesService) {}

  @RequirePermissions('workflow-templates:read')
  @Get()
  @ApiOperation({
    summary: 'List workflow templates (admin or project manager only)',
  })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<WorkflowTemplate[]> {
    const opts = resolveListQuery<WorkflowTemplate>(
      query,
      SORTABLE,
      'createdAt',
      'ASC',
    );
    const [items, total] = await this.service.findPaginated(
      { ...opts, projectId: query.projectId },
      user,
    );
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('workflow-templates:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow template with its ordered stages' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<WorkflowTemplate> {
    return this.service.findOneWithStages(id, user);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a workflow template (admin or project manager only)',
  })
  create(
    @Body() dto: CreateWorkflowTemplateDto,
    @CurrentUser() user: User,
  ): Promise<WorkflowTemplate> {
    return this.service.create(dto, user);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary:
      'Duplicate a template into a new editable one (admin or project manager)',
  })
  duplicate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateWorkflowTemplateDto,
    @CurrentUser() user: User,
  ): Promise<WorkflowTemplate> {
    return this.service.duplicate(id, dto.projectId, user);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a template; replaces stages when provided (admin or manager)',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkflowTemplateDto,
    @CurrentUser() user: User,
  ): Promise<WorkflowTemplate> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a workflow template (admin or project manager only)',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}

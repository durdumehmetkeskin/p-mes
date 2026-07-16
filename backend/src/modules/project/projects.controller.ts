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
import { AddContactDto } from './dto/add-contact.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { Project } from './entities/project.entity';
import {
  ProjectsService,
  type ProjectContact,
  type ProjectMember,
} from './projects.service';
import {
  ProjectAllocationsService,
  type MaterialDemandRow,
  type ProjectMaterialDetail,
  type ProjectMaterialRow,
} from './project-allocations.service';
import type { Tool } from '../tooling/entities/tool.entity';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof Project> = [
  'code',
  'name',
  'status',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('projects')
@ApiBearerAuth('access-token')
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly service: ProjectsService,
    private readonly allocations: ProjectAllocationsService,
  ) {}

  @RequirePermissions('projects:read')
  @Get()
  @ApiOperation({ summary: 'List projects (non-admins see only their own)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<Project[]> {
    const opts = resolveListQuery<Project>(query, SORTABLE, 'code', 'ASC');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      q: query.q,
      customerCompanyId: query.customerCompanyId,
      user,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('projects:read')
  @Get(':id/members')
  @ApiOperation({ summary: 'List the users assigned to a project' })
  async listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProjectMember[]> {
    await this.service.findOneForUser(id, user); // 404 for non-members
    return this.service.listMembers(id);
  }

  @RequirePermissions('projects:manage-members')
  @Get(':id/assignable-users')
  @ApiOperation({ summary: 'List users that can be added to the team' })
  assignableUsers(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectMember[]> {
    return this.service.assignableUsers(id);
  }

  @RequirePermissions('projects:manage-members')
  @Post(':id/members')
  @ApiOperation({ summary: 'Assign a user to a project' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMemberDto,
  ): Promise<ProjectMember[]> {
    return this.service.addMember(id, dto.userId);
  }

  @RequirePermissions('projects:manage-members')
  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a user from a project' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<ProjectMember[]> {
    return this.service.removeMember(id, userId);
  }

  @RequirePermissions('projects:read')
  @Get(':id/contacts')
  @ApiOperation({ summary: 'List the contacts attached to a project' })
  async listContacts(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProjectContact[]> {
    await this.service.findOneForUser(id, user); // 404 for non-members
    return this.service.listContacts(id);
  }

  @RequirePermissions('projects:manage-contacts')
  @Get(':id/assignable-contacts')
  @ApiOperation({
    summary: "List the customer's contacts that can be attached",
  })
  assignableContacts(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProjectContact[]> {
    return this.service.assignableContacts(id);
  }

  @RequirePermissions('projects:manage-contacts')
  @Post(':id/contacts')
  @ApiOperation({ summary: 'Attach a contact to a project' })
  addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddContactDto,
  ): Promise<ProjectContact[]> {
    return this.service.addContact(id, dto.contactId);
  }

  @RequirePermissions('projects:manage-contacts')
  @Delete(':id/contacts/:contactId')
  @ApiOperation({ summary: 'Detach a contact from a project' })
  removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ): Promise<ProjectContact[]> {
    return this.service.removeContact(id, contactId);
  }

  // Materials/tools allocated to a project (members only for non-admins).
  // "Allocated" = assigned to the project, or via a lot allocated to it, or via
  // stock reserved for its orders (materials) / placed in its zones/racks (tools).
  @RequirePermissions('projects:read')
  @Get(':id/materials')
  @ApiOperation({ summary: "List a project's allocated materials + stock" })
  async projectMaterials(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<ProjectMaterialRow[]> {
    await this.service.findOneForUser(id, user); // 404 for non-members
    return this.allocations.materialsForProject(id);
  }

  // Demand list: materials whose total uncovered need across the project's
  // orders exceeds the project's available stock, with a per-order breakdown.
  @RequirePermissions('projects:read')
  @Get(':id/material-demands')
  @ApiOperation({
    summary:
      "A project's material shortages (demand list, per-order breakdown)",
  })
  async projectMaterialDemands(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<MaterialDemandRow[]> {
    await this.service.findOneForUser(id, user); // 404 for non-members
    return this.allocations.materialDemandsForProject(id);
  }

  @RequirePermissions('projects:read')
  @Get(':id/tools')
  @ApiOperation({ summary: "List a project's allocated tools" })
  async projectTools(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Tool[]> {
    await this.service.findOneForUser(id, user);
    return this.allocations.toolsForProject(id);
  }

  // Project-scoped material detail: only this project's lots, their stock (by
  // rack), reserved stock and movements.
  @RequirePermissions('projects:read')
  @Get(':id/materials/:materialId')
  @ApiOperation({
    summary: "A material's lots/stock/movements within a project",
  })
  async projectMaterialDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @CurrentUser() user: User,
  ): Promise<ProjectMaterialDetail> {
    await this.service.findOneForUser(id, user);
    return this.allocations.materialDetailForProject(id, materialId);
  }

  @RequirePermissions('projects:read')
  @Get(':id')
  @ApiOperation({
    summary: 'Get a project by id (members only for non-admins)',
  })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.service.findOneForUser(id, user);
  }

  @RequirePermissions('projects:create')
  @Post()
  @ApiOperation({ summary: 'Create a project (creator joins the team)' })
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.service.create(dto, user);
  }

  @RequirePermissions('projects:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a project (members only for non-admins)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: User,
  ): Promise<Project> {
    return this.service.update(id, dto, user);
  }

  @RequirePermissions('projects:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a project (soft-delete; admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}

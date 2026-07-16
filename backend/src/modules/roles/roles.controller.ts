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
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles-query.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { RolesService } from './roles.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Role> = [
  'id',
  'name',
  'isSystem',
  'createdAt',
  'updatedAt',
];

@ApiTags('roles')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions('roles:create')
  @Post()
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(dto);
  }

  @RequirePermissions('roles:read')
  @Get()
  @ApiOperation({ summary: 'List roles (paginated)' })
  async findAll(
    @Query() query: ListRolesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Role[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Role)
      ? (query._sort as keyof Role)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.rolesService.findPaginated({
      skip,
      take,
      sort,
      order,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('roles:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a role by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  @RequirePermissions('roles:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a role (system roles cannot be renamed)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<Role> {
    return this.rolesService.update(id, dto);
  }

  @RequirePermissions('roles:update-permissions')
  @Patch(':id/permissions')
  @ApiOperation({
    summary: "Set a role's permissions (Admin role is immutable)",
  })
  updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionsDto,
  ): Promise<Role> {
    return this.rolesService.updatePermissions(id, dto.permissions);
  }

  @RequirePermissions('roles:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role (system roles are protected)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.rolesService.remove(id);
  }
}

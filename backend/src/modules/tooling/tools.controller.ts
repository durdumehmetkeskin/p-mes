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
  StreamableFile,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WarehouseScoped } from '../auth/decorators/warehouse-scoped.decorator';
import { WarehouseScopeService } from '../inventory/warehouse-scope.service';
import { User } from '../users/entities/user.entity';
import { ChangeToolStatusDto } from './dto/change-tool-status.dto';
import { CreateToolDto } from './dto/create-tool.dto';
import { ListToolsQueryDto } from './dto/list-tools-query.dto';
import { UpdateToolDto } from './dto/update-tool.dto';
import { Tool } from './entities/tool.entity';
import { ToolsService } from './tools.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Tool> = [
  'id',
  'code',
  'name',
  'category',
  'status',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('tools')
@ApiBearerAuth('access-token')
@Controller('tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  // Reads available to holders of the permission and to warehouse responsibles
  // (scoped to tools stored in their warehouses).
  @RequirePermissions('tools:read')
  @WarehouseScoped()
  @Get()
  @ApiOperation({
    summary: 'List tools (paginated, filterable by category/status/warehouse)',
  })
  async findAll(
    @Query() query: ListToolsQueryDto,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Tool[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Tool)
      ? (query._sort as keyof Tool)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.toolsService.findPaginated({
      skip,
      take,
      sort,
      order,
      q: query.q,
      category: query.category,
      status: query.status,
      rackId: query.rackId,
      warehouseId: query.warehouseId,
      projectId: query.projectId,
      scope: WarehouseScopeService.resolveScope(user, 'tools:read'),
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('tools:read')
  @WarehouseScoped()
  @Get(':id')
  @ApiOperation({ summary: 'Get a tool by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Tool> {
    return this.toolsService.findOne(
      id,
      WarehouseScopeService.resolveScope(user, 'tools:read'),
    );
  }

  @RequirePermissions('tools:read')
  @WarehouseScoped()
  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate a QR code (PNG) for a tool' })
  async generateQr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileName, buffer } = await this.toolsService.generateQr(
      id,
      WarehouseScopeService.resolveScope(user, 'tools:read'),
    );
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
        fileName,
      )}`,
    });
    return new StreamableFile(buffer);
  }

  // Writes are permitted for holders of the key and for warehouse responsibles
  // operating on tools within their warehouses.
  @RequirePermissions('tools:create')
  @WarehouseScoped()
  @Post()
  @ApiOperation({
    summary: 'Create a tool (responsibles: into their warehouse)',
  })
  create(@Body() dto: CreateToolDto, @CurrentUser() user: User): Promise<Tool> {
    return this.toolsService.create(
      dto,
      WarehouseScopeService.resolveScope(user, 'tools:create'),
    );
  }

  @RequirePermissions('tools:update')
  @WarehouseScoped()
  @Patch(':id')
  @ApiOperation({ summary: 'Update a tool (place/move via rack)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateToolDto,
    @CurrentUser() user: User,
  ): Promise<Tool> {
    return this.toolsService.update(
      id,
      dto,
      WarehouseScopeService.resolveScope(user, 'tools:update'),
    );
  }

  @RequirePermissions('tools:update-status')
  @WarehouseScoped()
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change a tool status; records a history entry',
  })
  changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeToolStatusDto,
    @CurrentUser() user: User,
  ): Promise<Tool> {
    return this.toolsService.changeStatus(
      id,
      dto,
      user,
      WarehouseScopeService.resolveScope(user, 'tools:update-status'),
    );
  }

  @RequirePermissions('tools:delete')
  @WarehouseScoped()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tool' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.toolsService.remove(
      id,
      WarehouseScopeService.resolveScope(user, 'tools:delete'),
    );
  }
}

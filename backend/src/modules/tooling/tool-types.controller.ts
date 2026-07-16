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
import { CreateToolTypeDto } from './dto/create-tool-type.dto';
import { ListToolTypesQueryDto } from './dto/list-tool-types-query.dto';
import { UpdateToolTypeDto } from './dto/update-tool-type.dto';
import { ToolType } from './entities/tool-type.entity';
import { ToolTypesService } from './tool-types.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof ToolType> = [
  'id',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('tool-types')
@ApiBearerAuth('access-token')
@Controller('tool-types')
export class ToolTypesController {
  constructor(private readonly toolTypesService: ToolTypesService) {}

  // Reads available to any authenticated user (needed by the tool form).
  @RequirePermissions('tool-types:read')
  @Get()
  @ApiOperation({ summary: 'List tool types (paginated)' })
  async findAll(
    @Query() query: ListToolTypesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ToolType[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof ToolType)
      ? (query._sort as keyof ToolType)
      : 'name';
    const order = query._order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const [items, total] = await this.toolTypesService.findPaginated({
      skip,
      take,
      sort,
      order,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('tool-types:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a tool type by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ToolType> {
    return this.toolTypesService.findOne(id);
  }

  // Writes require the admin role.
  @RequirePermissions('tool-types:create')
  @Post()
  @ApiOperation({ summary: 'Create a tool type (admin only)' })
  create(@Body() dto: CreateToolTypeDto): Promise<ToolType> {
    return this.toolTypesService.create(dto);
  }

  @RequirePermissions('tool-types:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a tool type (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateToolTypeDto,
  ): Promise<ToolType> {
    return this.toolTypesService.update(id, dto);
  }

  @RequirePermissions('tool-types:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a tool type (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.toolTypesService.remove(id);
  }
}

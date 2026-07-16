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
import { CreateMaterialUnitDto } from './dto/create-material-unit.dto';
import { ListMaterialUnitsQueryDto } from './dto/list-material-units-query.dto';
import { UpdateMaterialUnitDto } from './dto/update-material-unit.dto';
import { MaterialUnit } from './entities/material-unit.entity';
import { MaterialUnitsService } from './material-units.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof MaterialUnit> = [
  'id',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('material-units')
@ApiBearerAuth('access-token')
@Controller('material-units')
export class MaterialUnitsController {
  constructor(private readonly materialUnitsService: MaterialUnitsService) {}

  // Reads available to any authenticated user (needed by the material form).
  @RequirePermissions('material-units:read')
  @Get()
  @ApiOperation({ summary: 'List material units (paginated)' })
  async findAll(
    @Query() query: ListMaterialUnitsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MaterialUnit[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof MaterialUnit)
      ? (query._sort as keyof MaterialUnit)
      : 'name';
    const order = query._order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const [items, total] = await this.materialUnitsService.findPaginated({
      skip,
      take,
      sort,
      order,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('material-units:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a material unit by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MaterialUnit> {
    return this.materialUnitsService.findOne(id);
  }

  // Writes require the admin role.
  @RequirePermissions('material-units:create')
  @Post()
  @ApiOperation({ summary: 'Create a material unit (admin only)' })
  create(@Body() dto: CreateMaterialUnitDto): Promise<MaterialUnit> {
    return this.materialUnitsService.create(dto);
  }

  @RequirePermissions('material-units:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a material unit (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialUnitDto,
  ): Promise<MaterialUnit> {
    return this.materialUnitsService.update(id, dto);
  }

  @RequirePermissions('material-units:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a material unit (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.materialUnitsService.remove(id);
  }
}

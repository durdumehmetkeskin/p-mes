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
import { CreateMaterialTypeDto } from './dto/create-material-type.dto';
import { ListMaterialTypesQueryDto } from './dto/list-material-types-query.dto';
import { UpdateMaterialTypeDto } from './dto/update-material-type.dto';
import { MaterialType } from './entities/material-type.entity';
import { MaterialTypesService } from './material-types.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof MaterialType> = [
  'id',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('material-types')
@ApiBearerAuth('access-token')
@Controller('material-types')
export class MaterialTypesController {
  constructor(private readonly materialTypesService: MaterialTypesService) {}

  // Reads available to any authenticated user (needed by the material form).
  @RequirePermissions('material-types:read')
  @Get()
  @ApiOperation({ summary: 'List material types (paginated)' })
  async findAll(
    @Query() query: ListMaterialTypesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<MaterialType[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof MaterialType)
      ? (query._sort as keyof MaterialType)
      : 'name';
    const order = query._order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const [items, total] = await this.materialTypesService.findPaginated({
      skip,
      take,
      sort,
      order,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('material-types:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a material type by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MaterialType> {
    return this.materialTypesService.findOne(id);
  }

  // Writes require the admin role.
  @RequirePermissions('material-types:create')
  @Post()
  @ApiOperation({ summary: 'Create a material type (admin only)' })
  create(@Body() dto: CreateMaterialTypeDto): Promise<MaterialType> {
    return this.materialTypesService.create(dto);
  }

  @RequirePermissions('material-types:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a material type (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialTypeDto,
  ): Promise<MaterialType> {
    return this.materialTypesService.update(id, dto);
  }

  @RequirePermissions('material-types:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a material type (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.materialTypesService.remove(id);
  }
}

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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { WarehouseScoped } from '../auth/decorators/warehouse-scoped.decorator';
import { CreateMaterialDto } from './dto/create-material.dto';
import { ListMaterialsQueryDto } from './dto/list-materials-query.dto';
import { UpdateMaterialDto } from './dto/update-material.dto';
import { Material } from './entities/material.entity';
import { MaterialsService } from './materials.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Material> = [
  'id',
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('materials')
@ApiBearerAuth('access-token')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  // Reads are available to holders of the permission and to warehouse
  // responsibles (the global catalog powers receive/transfer pickers). The
  // catalog itself is not warehouse-scoped.
  @RequirePermissions('materials:read')
  @WarehouseScoped()
  @Get()
  @ApiOperation({ summary: 'List materials (paginated)' })
  async findAll(
    @Query() query: ListMaterialsQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Material[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Material)
      ? (query._sort as keyof Material)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.materialsService.findPaginated({
      skip,
      take,
      sort,
      order,
      q: query.q,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('materials:read')
  @WarehouseScoped()
  @Get(':id')
  @ApiOperation({ summary: 'Get a material by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Material> {
    return this.materialsService.findOne(id);
  }

  @RequirePermissions('materials:read')
  @WarehouseScoped()
  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate a QR code (PNG) for a material' })
  async generateQr(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileName, buffer } = await this.materialsService.generateQr(id);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
        fileName,
      )}`,
    });
    return new StreamableFile(buffer);
  }

  // Writes require the admin role.
  @RequirePermissions('materials:create')
  @Post()
  @ApiOperation({ summary: 'Create a material (admin only)' })
  create(@Body() dto: CreateMaterialDto): Promise<Material> {
    return this.materialsService.create(dto);
  }

  @RequirePermissions('materials:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a material (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaterialDto,
  ): Promise<Material> {
    return this.materialsService.update(id, dto);
  }

  @RequirePermissions('materials:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a material (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.materialsService.remove(id);
  }
}

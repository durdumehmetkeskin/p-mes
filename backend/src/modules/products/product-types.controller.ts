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
import { resolveListQuery } from '../../common/query/list-query.util';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { ListProductTypesQueryDto } from './dto/list-product-types-query.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductType } from './entities/product-type.entity';
import { ProductTypesService } from './product-types.service';

const SORTABLE: ReadonlyArray<keyof ProductType> = [
  'id',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('product-types')
@ApiBearerAuth('access-token')
@Controller('product-types')
export class ProductTypesController {
  constructor(private readonly productTypesService: ProductTypesService) {}

  // Reads available to anyone who can read products (needed by the form).
  @RequirePermissions('product-types:read')
  @Get()
  @ApiOperation({ summary: 'List product types (paginated)' })
  async findAll(
    @Query() query: ListProductTypesQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ProductType[]> {
    const opts = resolveListQuery<ProductType>(query, SORTABLE, 'name', 'ASC');
    const [items, total] = await this.productTypesService.findPaginated(opts);
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('product-types:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a product type by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductType> {
    return this.productTypesService.findOne(id);
  }

  @RequirePermissions('product-types:create')
  @Post()
  @ApiOperation({ summary: 'Create a product type' })
  create(@Body() dto: CreateProductTypeDto): Promise<ProductType> {
    return this.productTypesService.create(dto);
  }

  @RequirePermissions('product-types:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product type' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductTypeDto,
  ): Promise<ProductType> {
    return this.productTypesService.update(id, dto);
  }

  @RequirePermissions('product-types:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product type' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productTypesService.remove(id);
  }
}

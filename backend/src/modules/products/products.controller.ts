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
import { resolveListQuery } from '../../common/query/list-query.util';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { ConsumeProductDto } from './dto/consume-product.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { StoreProductDto } from './dto/store-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';

const SORTABLE: ReadonlyArray<keyof Product> = [
  'code',
  'name',
  'quantity',
  'producedAt',
  'createdAt',
  'updatedAt',
];

/**
 * Production-output records (intermediate products, finished products, molds).
 * Non-admin reads are scoped through the origin order's project membership;
 * origin-less products are visible to anyone with products:read.
 */
@ApiTags('products')
@ApiBearerAuth('access-token')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @RequirePermissions('products:read')
  @Get()
  @ApiOperation({ summary: 'List products (paginated)' })
  async findAll(
    @Query() query: ListProductsQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<Product[]> {
    const opts = resolveListQuery<Product>(query, SORTABLE, 'createdAt');
    const [items, total] = await this.productsService.findPaginated(
      {
        ...opts,
        q: query.q,
        orderId: query.orderId,
        processId: query.processId,
        stageId: query.stageId,
        productTypeId: query.productTypeId,
        storageId: query.storageId,
        storageRackId: query.storageRackId,
        consumedByStageId: query.consumedByStageId,
        consumedByProcessId: query.consumedByProcessId,
        unconsumed: query.unconsumed,
      },
      user,
    );
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('products:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a product by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Product> {
    return this.productsService.findOne(id, user);
  }

  @RequirePermissions('products:create')
  @Post()
  @ApiOperation({ summary: 'Record a produced product' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: User,
  ): Promise<Product> {
    return this.productsService.create(dto, user);
  }

  @RequirePermissions('products:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: User,
  ): Promise<Product> {
    return this.productsService.update(id, dto, user);
  }

  @RequirePermissions('products:read')
  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate a QR code (PNG) for a product' })
  async generateQr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileName, buffer } = await this.productsService.generateQr(
      id,
      user,
    );
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
        fileName,
      )}`,
    });
    return new StreamableFile(buffer);
  }

  // No @RequirePermissions: ONE-SIDED drop-off — any project-scoped user may
  // shelve the product on a location-storage rack (service findOne scoping).
  @Post(':id/store')
  @ApiOperation({
    summary:
      "Drop the product onto a location-storage rack (one-sided; → received)",
  })
  store(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StoreProductDto,
    @CurrentUser() user: User,
  ): Promise<Product> {
    return this.productsService.store(id, dto.storageRackId, user);
  }

  // Marking a product as a stage's input is stage work, not product editing —
  // its own granular key (precedent: stock-items:create-consume).
  @RequirePermissions('products:consume')
  @Post(':id/consume')
  @ApiOperation({ summary: "Use a product as a stage's input" })
  consume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConsumeProductDto,
    @CurrentUser() user: User,
  ): Promise<Product> {
    return this.productsService.consume(id, dto.stageId, user);
  }

  @RequirePermissions('products:consume')
  @Delete(':id/consume')
  @ApiOperation({ summary: "Release a product from its consuming stage" })
  releaseConsume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Product> {
    return this.productsService.release(id, user);
  }

  @RequirePermissions('products:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.productsService.remove(id, user);
  }
}

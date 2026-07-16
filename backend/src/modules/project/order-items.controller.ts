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
import type { User } from '../users/entities/user.entity';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderItem } from './entities/order-item.entity';
import { OrderItemsService } from './order-items.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof OrderItem> = [
  'sequence',
  'name',
  'status',
  'createdAt',
  'updatedAt',
];

@ApiTags('order-items')
@ApiBearerAuth('access-token')
@Controller('order-items')
export class OrderItemsController {
  constructor(private readonly service: OrderItemsService) {}

  @RequirePermissions('order-items:read')
  @Get()
  @ApiOperation({ summary: 'List order items (paginated, filter by order)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<OrderItem[]> {
    const opts = resolveListQuery<OrderItem>(
      query,
      SORTABLE,
      'sequence',
      'ASC',
    );
    const [items, total] = await this.service.findPaginated({
      ...opts,
      orderId: query.orderId,
      user,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('order-items:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get an order item by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<OrderItem> {
    return this.service.findOne(id, user);
  }

  @RequirePermissions('order-items:read')
  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate a QR code (PNG) for an order item' })
  async generateQr(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { fileName, buffer } = await this.service.generateQr(id, user);
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(
        fileName,
      )}`,
    });
    return new StreamableFile(buffer);
  }

  @RequirePermissions('order-items:create')
  @Post()
  @ApiOperation({ summary: 'Create an order item' })
  create(
    @Body() dto: CreateOrderItemDto,
    @CurrentUser() user: User,
  ): Promise<OrderItem> {
    return this.service.create(dto, user);
  }

  @RequirePermissions('order-items:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update an order item' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentUser() user: User,
  ): Promise<OrderItem> {
    return this.service.update(id, dto, user);
  }

  @RequirePermissions('order-items:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an order item (cascades its processes)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}

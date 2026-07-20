import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof Order> = [
  'orderNumber',
  'status',
  'dueDate',
  'createdAt',
  'updatedAt',
];

@ApiTags('orders')
@ApiBearerAuth('access-token')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @RequirePermissions('orders:read')
  @Get()
  @ApiOperation({ summary: 'List orders (paginated, filter by project)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<Order[]> {
    const opts = resolveListQuery<Order>(query, SORTABLE, 'createdAt');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      projectId: query.projectId,
      user,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('orders:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get an order by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Order> {
    return this.service.findOne(id, user);
  }

  // The order's reserved pool (stageId NULL) — what the stage dialog assigns
  // from. Membership-gated like every order read.
  @RequirePermissions('orders:read')
  @Get(':id/stock-items')
  @ApiOperation({
    summary: 'Stock reserved for the order but not yet assigned to a stage',
  })
  poolStockItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<unknown[]> {
    return this.service.orderPoolStockItems(id, user);
  }

  // No @RequirePermissions: authorization is decided in the service — only an
  // admin or the project's manager may create an order (the manager may lack
  // the orders:create key, so a guard-level check would lock them out).
  @Post()
  @ApiOperation({ summary: 'Create an order (admin or project manager only)' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User,
  ): Promise<Order> {
    return this.service.create(dto, user);
  }

  // No @RequirePermissions: service-enforced — admin or project manager only.
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary:
      'Delete an order (admin or project manager only; blocked if it has any process)',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}

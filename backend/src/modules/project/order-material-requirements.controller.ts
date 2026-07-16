import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateOrderMaterialRequirementDto } from './dto/create-order-material-requirement.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { ReserveOrderMaterialRequirementDto } from './dto/reserve-order-material-requirement.dto';
import { UpdateOrderMaterialRequirementDto } from './dto/update-order-material-requirement.dto';
import { OrderMaterialRequirement } from './entities/order-material-requirement.entity';
import {
  OrderMaterialRequirementsService,
  OrderMaterialRequirementView,
} from './order-material-requirements.service';
import { OrdersService } from './orders.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof OrderMaterialRequirement> = [
  'requiredQuantity',
  'createdAt',
  'updatedAt',
];

/**
 * Per-order required-materials list. Every route is scoped through the order's
 * owning project (OrdersService.findOne → 404 for non-members). List rows are
 * enriched with reservation progress + the project's available stock so the
 * client can render reserve state without extra round-trips.
 */
@ApiTags('order-material-requirements')
@ApiBearerAuth('access-token')
@Controller('order-material-requirements')
export class OrderMaterialRequirementsController {
  constructor(
    private readonly service: OrderMaterialRequirementsService,
    private readonly orders: OrdersService,
  ) {}

  @RequirePermissions('projects:read')
  @Get()
  @ApiOperation({ summary: "List an order's required materials" })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<OrderMaterialRequirementView[]> {
    if (!query.orderId) {
      throw new BadRequestException('orderId is required');
    }
    const order = await this.orders.findOne(query.orderId, user); // 404 non-members
    const opts = resolveListQuery<OrderMaterialRequirement>(
      query,
      SORTABLE,
      'createdAt',
      'DESC',
    );
    const [items, total] = await this.service.findPaginated({
      ...opts,
      orderId: query.orderId,
      projectId: order.projectId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('projects:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a required-material row' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<OrderMaterialRequirement> {
    const row = await this.service.findOne(id);
    await this.orders.findOne(row.orderId, user);
    return row;
  }

  @RequirePermissions('projects:update')
  @Post()
  @ApiOperation({ summary: 'Add a material to an order requirements list' })
  async create(
    @Body() dto: CreateOrderMaterialRequirementDto,
    @CurrentUser() user: User,
  ): Promise<OrderMaterialRequirement> {
    await this.orders.findOne(dto.orderId, user);
    return this.service.create(dto);
  }

  @RequirePermissions('projects:update')
  @Patch(':id')
  @ApiOperation({ summary: "Update a requirement's quantity / note" })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderMaterialRequirementDto,
    @CurrentUser() user: User,
  ): Promise<OrderMaterialRequirement> {
    const row = await this.service.findOne(id);
    await this.orders.findOne(row.orderId, user);
    return this.service.update(id, dto);
  }

  @RequirePermissions('stock-items:create-reserve')
  @Post(':id/reserve')
  @ApiOperation({
    summary: "Reserve stock for a requirement's order (FIFO across lots)",
  })
  async reserve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReserveOrderMaterialRequirementDto,
    @CurrentUser() user: User,
  ): Promise<{ requested: number; reserved: number; remaining: number }> {
    const row = await this.service.findOne(id);
    const order = await this.orders.findOne(row.orderId, user);
    return this.service.reserveStock(row, order, dto.quantity, user?.id);
  }

  @RequirePermissions('projects:update')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a material from the requirements list' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    const row = await this.service.findOne(id);
    await this.orders.findOne(row.orderId, user);
    await this.service.remove(id, user?.id);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { QrService } from '../qr/qr.service';
import { QrResult } from '../qr/qr.types';
import type { User } from '../users/entities/user.entity';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { ProjectsService } from './projects.service';

@Injectable()
export class OrderItemsService {
  constructor(
    @InjectRepository(OrderItem) private readonly repo: Repository<OrderItem>,
    private readonly projects: ProjectsService,
    private readonly ordersService: OrdersService,
    private readonly qrService: QrService,
  ) {}

  async create(dto: CreateOrderItemDto, user?: User): Promise<OrderItem> {
    // Non-admins must be a member of the target order's project.
    if (user && !ProjectsService.isAdmin(user)) {
      if (!(await this.projects.memberOfOrderProject(dto.orderId, user.id))) {
        throw new NotFoundException('Order not found');
      }
    }
    const saved = await this.repo.save(this.repo.create(dto));
    return this.findOne(saved.id);
  }

  async findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof OrderItem;
    order: 'ASC' | 'DESC';
    orderId?: string;
    user?: User;
  }): Promise<[OrderItem[], number]> {
    const where: FindOptionsWhere<OrderItem> = {};
    if (options.orderId) where.orderId = options.orderId;
    // Non-admins only see items of orders in projects they are a member of.
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      const ids = await this.projects.memberProjectIds(options.user.id);
      where.order = { projectId: In(ids) };
    }
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string, user?: User): Promise<OrderItem> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Order item ${id} not found`);
    await this.assertOrderAccess(found.order.projectId, user, id);
    return found;
  }

  /**
   * Generate a QR code (PNG) for an order line item. QR codes live at the
   * item level (not the order): the business code is
   * `<orderNumber>-<sequence>` and the deep link opens the owning order.
   * Membership scoping via {@link findOne}.
   */
  async generateQr(id: string, user?: User): Promise<QrResult> {
    const item = await this.findOne(id, user);
    const code = `${item.order.orderNumber}-${item.sequence}`;
    const payload = this.qrService.buildPayload(
      'order-item',
      item.id,
      code,
      `/projects/${item.order.projectId}/orders/${item.orderId}`,
    );
    const buffer = await this.qrService.toPng(payload);
    return { fileName: this.qrService.fileName('order-item', code), buffer };
  }

  async update(
    id: string,
    dto: UpdateOrderItemDto,
    user?: User,
  ): Promise<OrderItem> {
    await this.findOne(id, user);
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string, user?: User): Promise<void> {
    await this.findOne(id, user);
    // Load processes (+ their stages) so the soft-remove cascades all the way.
    const withChildren = await this.repo.findOne({
      where: { id },
      relations: { processes: { stages: true } },
    });
    if (!withChildren)
      throw new NotFoundException(`Order item ${id} not found`);
    await this.repo.softRemove(withChildren);
    // The cascade removed the item's processes — re-derive the order status.
    await this.ordersService.recomputeStatus(withChildren.orderId);
  }

  /** Non-admins must be a member of the item's order's project (404 otherwise). */
  private async assertOrderAccess(
    projectId: string,
    user?: User,
    notFoundId?: string,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (!(await this.projects.isMember(projectId, user.id))) {
      throw new NotFoundException(
        notFoundId ? `Order item ${notFoundId} not found` : 'Order not found',
      );
    }
  }
}

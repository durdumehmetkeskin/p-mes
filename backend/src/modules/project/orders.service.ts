import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockItemStatus } from '../inventory/enums/stock-item-status.enum';
import { StockItemsService } from '../inventory/stock-items.service';
import type { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { ProcessStatus } from './enums/process-status.enum';
import { OrderItem } from './entities/order-item.entity';
import { OrderMaterialRequirement } from './entities/order-material-requirement.entity';
import { Process } from './entities/process.entity';
import { ProjectsService } from './projects.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly repo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItems: Repository<OrderItem>,
    @InjectRepository(Process)
    private readonly processes: Repository<Process>,
    @InjectRepository(StockItem)
    private readonly stockItemRepo: Repository<StockItem>,
    private readonly projects: ProjectsService,
    private readonly stockItems: StockItemsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * The order's reserved POOL: stock reserved for the order but not yet
   * assigned to any stage (membership-gated) — the source the stage dialog
   * assigns from. Same shape as ProcessStagesService.stockItemsForStage.
   */
  async orderPoolStockItems(orderId: string, user?: User): Promise<unknown[]> {
    await this.findOne(orderId, user); // 404 + membership scoping
    const items = await this.stockItemRepo.find({
      where: {
        orderId,
        stageId: IsNull(),
        status: In([StockItemStatus.Reserving, StockItemStatus.Reserved]),
      },
      relations: {
        lot: { material: { materialUnit: true } },
        warehouse: true,
        rack: true,
      },
      loadEagerRelations: false,
      order: { createdAt: 'ASC' },
    });
    return items.map((it) => ({
      id: it.id,
      quantity: it.quantity,
      status: it.status,
      lot: it.lot ? { id: it.lot.id, lotNumber: it.lot.lotNumber } : null,
      material: it.lot?.material
        ? {
            id: it.lot.material.id,
            code: it.lot.material.code,
            name: it.lot.material.name,
            unit: it.lot.material.materialUnit?.name ?? null,
          }
        : null,
      warehouse: it.warehouse ? { code: it.warehouse.code } : null,
      rack: it.rack ? { code: it.rack.code } : null,
    }));
  }

  /**
   * Re-derive the order's status from its processes: `completed` when it has
   * processes and every one is completed, `in_progress` when any process is
   * past draft, else `pending`. Called after every process/stage mutation
   * (mirrors ProcessStagesService.recomputeOverall one level up).
   */
  async recomputeStatus(orderId: string): Promise<void> {
    const rows = await this.processes
      .createQueryBuilder('p')
      .innerJoin('p.orderItem', 'oi')
      .where('oi.order_id = :orderId', { orderId })
      .select('p.overall_status', 'status')
      .getRawMany<{ status: ProcessStatus }>();
    await this.repo.update(orderId, {
      status: OrdersService.deriveStatus(rows.map((r) => r.status)),
    });
  }

  /**
   * Re-derive one ITEM's status from its own processes — same lifecycle as
   * the order one level up: `completed` when it has processes and all are
   * completed, `in_progress` when any process is past draft, else `pending`.
   */
  async recomputeItemStatus(orderItemId: string): Promise<void> {
    const rows = await this.processes
      .createQueryBuilder('p')
      .where('p.order_item_id = :orderItemId', { orderItemId })
      .select('p.overall_status', 'status')
      .getRawMany<{ status: ProcessStatus }>();
    await this.orderItems.update(orderItemId, {
      status: OrdersService.deriveStatus(rows.map((r) => r.status)),
    });
  }

  private static deriveStatus(statuses: ProcessStatus[]): OrderStatus {
    if (
      statuses.length > 0 &&
      statuses.every((s) => s === ProcessStatus.Completed)
    ) {
      return OrderStatus.Completed;
    }
    if (statuses.some((s) => s !== ProcessStatus.Draft)) {
      return OrderStatus.InProgress;
    }
    return OrderStatus.Pending;
  }

  async create(dto: CreateOrderDto, user?: User): Promise<Order> {
    await this.assertProjectAccess(dto.projectId, user);
    await this.assertOrderEditor(dto.projectId, user);
    // status is server-managed (derived from processes) — drop any sent value;
    // a new order always starts `pending`. orderNumber is user-entered.
    const { status: _status, ...rest } = dto;
    // Friendly duplicate check (the unique index spans soft-deleted rows too).
    const existing = await this.repo.findOne({
      where: { orderNumber: rest.orderNumber },
      withDeleted: true,
      loadEagerRelations: false,
    });
    if (existing) {
      throw new ConflictException(
        `"${rest.orderNumber}" sipariş numarası zaten kullanılmış.`,
      );
    }
    const saved = await this.repo.save(this.repo.create(rest));
    return this.findOne(saved.id);
  }

  async findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Order;
    order: 'ASC' | 'DESC';
    projectId?: string;
    user?: User;
  }): Promise<[Order[], number]> {
    const where: FindOptionsWhere<Order> = {};
    if (options.projectId) where.projectId = options.projectId;
    // Non-admins only see orders of projects they are a member of.
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      const ids = await this.projects.memberProjectIds(options.user.id);
      if (options.projectId) {
        if (!ids.includes(options.projectId)) return [[], 0];
      } else {
        where.projectId = In(ids);
      }
    }
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string, user?: User): Promise<Order> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Order ${id} not found`);
    await this.assertProjectAccess(found.projectId, user, id);
    return found;
  }

  /**
   * Delete an order (leaf-first): blocked if it still has any process. Releases
   * stock reserved directly to the order back to available, then soft-removes
   * the order and its line items.
   */
  async remove(id: string, user?: User): Promise<void> {
    const order = await this.findOne(id, user); // 404 + membership scoping
    await this.assertOrderEditor(order.projectId, user);
    const processCount = await this.processes
      .createQueryBuilder('p')
      .innerJoin('p.orderItem', 'oi')
      .where('oi.orderId = :id', { id })
      .getCount();
    if (processCount > 0) {
      throw new ConflictException(
        'Bu sipariş silinemez: bağlı prosesler var. Önce prosesleri silin.',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      await this.stockItems.releaseAllForOrder(id, manager);
      const items = await manager.find(OrderItem, { where: { orderId: id } });
      if (items.length) await manager.softRemove(items);
      // Orders are soft-removed, so the DB CASCADE never fires — cascade the
      // soft delete to the order's material requirements explicitly.
      const reqs = await manager.find(OrderMaterialRequirement, {
        where: { orderId: id },
      });
      if (reqs.length) await manager.softRemove(reqs);
      await manager.softRemove(order);
    });
  }

  /**
   * Order-level editing (order create/delete, required-materials list
   * add/edit/remove) is reserved to admins and the project's manager — plain
   * members keep read access. Runs AFTER the membership scoping (outsiders
   * keep getting 404; members get an explicit 403). Public: the
   * order-material-requirements controller reuses it.
   */
  async assertOrderEditor(projectId: string, user?: User): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    const project = await this.projects.findOne(projectId);
    if (project.managerUserId !== user.id) {
      throw new ForbiddenException(
        'Bu işlemi yalnızca proje yöneticisi veya admin yapabilir.',
      );
    }
  }

  /** Non-admins must be a member of the order's project (404 otherwise). */
  private async assertProjectAccess(
    projectId: string,
    user?: User,
    notFoundId?: string,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (!(await this.projects.isMember(projectId, user.id))) {
      throw new NotFoundException(
        notFoundId ? `Order ${notFoundId} not found` : 'Project not found',
      );
    }
  }
}

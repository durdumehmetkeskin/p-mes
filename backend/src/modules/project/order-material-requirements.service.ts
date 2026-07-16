import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Material } from '../inventory/entities/material.entity';
import {
  NotificationType,
  NotificationsService,
} from '../notifications/notifications.service';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockItemStatus } from '../inventory/enums/stock-item-status.enum';
import { StockItemsService } from '../inventory/stock-items.service';
import { CreateOrderMaterialRequirementDto } from './dto/create-order-material-requirement.dto';
import { UpdateOrderMaterialRequirementDto } from './dto/update-order-material-requirement.dto';
import { Order } from './entities/order.entity';
import { OrderMaterialRequirement } from './entities/order-material-requirement.entity';

/** Requirement row enriched with its reservation/stock progress. */
export interface OrderMaterialRequirementView extends OrderMaterialRequirement {
  /** Quantity split off but still pending warehouse preparation. */
  reservingQuantity: number;
  /** Quantity confirmed for the order (reserved/delivering/delivered). */
  reservedQuantity: number;
  /** Of that, quantity the warehouse is currently handing over. */
  deliveringQuantity: number;
  /** Of that, quantity received by the order (delivered). */
  deliveredQuantity: number;
  /** The order's project freely-available stock of the material. */
  availableQuantity: number;
}

/** Statuses that count as "held for the order" toward a requirement. */
const COVERED_STATUSES = [
  StockItemStatus.Reserved,
  StockItemStatus.Delivering,
  StockItemStatus.Delivered,
];

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

@Injectable()
export class OrderMaterialRequirementsService {
  constructor(
    @InjectRepository(OrderMaterialRequirement)
    private readonly repo: Repository<OrderMaterialRequirement>,
    @InjectRepository(Material)
    private readonly materials: Repository<Material>,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    private readonly stockItemsService: StockItemsService,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async findPaginated(options: {
    orderId: string;
    projectId: string;
    skip?: number;
    take?: number;
    sort: keyof OrderMaterialRequirement;
    order: 'ASC' | 'DESC';
  }): Promise<[OrderMaterialRequirementView[], number]> {
    const [rows, total] = await this.repo.findAndCount({
      where: { orderId: options.orderId },
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
    const views = await this.enrich(rows, options.orderId, options.projectId);
    return [views, total];
  }

  /** Attach per-material reservation progress + project available stock. */
  private async enrich(
    rows: OrderMaterialRequirement[],
    orderId: string,
    projectId: string,
  ): Promise<OrderMaterialRequirementView[]> {
    if (!rows.length) return [];
    const materialIds = [...new Set(rows.map((r) => r.materialId))];

    // Stock held for THIS order, by material and status.
    const held = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .select('l.material_id', 'materialId')
      .addSelect('si.status', 'status')
      .addSelect('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('si.order_id = :orderId', { orderId })
      .andWhere('l.material_id IN (:...materialIds)', { materialIds })
      .groupBy('l.material_id')
      .addGroupBy('si.status')
      .getRawMany<{ materialId: string; status: string; sum: string }>();
    const reserving = new Map<string, number>();
    const reserved = new Map<string, number>();
    const delivering = new Map<string, number>();
    const delivered = new Map<string, number>();
    const add = (map: Map<string, number>, key: string, sum: number) =>
      map.set(key, round3((map.get(key) ?? 0) + sum));
    for (const h of held) {
      const sum = Number(h.sum);
      const status = h.status as StockItemStatus;
      if (status === StockItemStatus.Reserving) {
        add(reserving, h.materialId, sum);
      } else if (COVERED_STATUSES.includes(status)) {
        // reservedQuantity = everything confirmed-or-later; delivering and
        // delivered are also broken out so the UI can show the handover state.
        add(reserved, h.materialId, sum);
        if (status === StockItemStatus.Delivering) {
          add(delivering, h.materialId, sum);
        } else if (status === StockItemStatus.Delivered) {
          add(delivered, h.materialId, sum);
        }
      }
    }

    // Freely-available stock of each material within the order's project.
    // Rack-order dedication does NOT limit reservations (placement preference
    // only), so the whole project pool counts.
    const avail = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .leftJoin('si.order', 'o')
      .select('l.material_id', 'materialId')
      .addSelect('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('l.material_id IN (:...materialIds)', { materialIds })
      .andWhere('si.status = :available', {
        available: StockItemStatus.Available,
      })
      .andWhere('(l.project_id = :projectId OR o.project_id = :projectId)', {
        projectId,
      })
      .groupBy('l.material_id')
      .getRawMany<{ materialId: string; sum: string }>();
    const available = new Map(avail.map((a) => [a.materialId, Number(a.sum)]));

    return rows.map((r) =>
      Object.assign(r, {
        reservingQuantity: reserving.get(r.materialId) ?? 0,
        reservedQuantity: reserved.get(r.materialId) ?? 0,
        deliveringQuantity: delivering.get(r.materialId) ?? 0,
        deliveredQuantity: delivered.get(r.materialId) ?? 0,
        availableQuantity: available.get(r.materialId) ?? 0,
      }),
    );
  }

  async findOne(id: string): Promise<OrderMaterialRequirement> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Material requirement ${id} not found`);
    }
    return found;
  }

  async create(
    dto: CreateOrderMaterialRequirementDto,
  ): Promise<OrderMaterialRequirement> {
    const material = await this.materials.findOne({
      where: { id: dto.materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material ${dto.materialId} not found`);
    }
    const existing = await this.repo.findOne({
      where: { orderId: dto.orderId, materialId: dto.materialId },
    });
    if (existing) {
      throw new ConflictException(
        'This material is already in the order requirements list',
      );
    }
    const saved = await this.repo.save(this.repo.create(dto));
    return this.findOne(saved.id); // reload with eager material
  }

  async update(
    id: string,
    dto: UpdateOrderMaterialRequirementDto,
  ): Promise<OrderMaterialRequirement> {
    const found = await this.findOne(id);
    Object.assign(found, dto);
    await this.repo.save(found);
    return this.findOne(id);
  }

  /**
   * Delete a requirement and give back everything held for it: warehouse-side
   * reservations (reserving/reserved) return to the available pool at once;
   * stock already handed out (delivering/delivered) flips to `returning` and
   * its holder is asked to bring it back — it becomes available again when the
   * warehouse re-receives it through the normal receive-return flow.
   */
  async remove(id: string, actorId?: string): Promise<void> {
    const found = await this.findOne(id);
    const returning = await this.dataSource.transaction(async (manager) => {
      const flipped = await this.stockItemsService.releaseForOrderMaterial(
        found.orderId,
        found.materialId,
        manager,
      );
      await manager.softRemove(found);
      return flipped;
    });
    // Notify only after the transaction committed.
    for (const item of returning) {
      const material = item.lot?.material;
      const label = `${material?.code ?? ''} ${material?.name ?? ''}`.trim();
      const orderLabel = item.order?.orderNumber ?? 'sipariş';
      await this.notifications.notifyUser(
        item.receivedByUserId ?? item.stage?.workers?.[0]?.id,
        {
          type: NotificationType.StockReturnRequested,
          title: 'Malzeme iadesi gerekiyor',
          message: `${label}: ${item.quantity} — ${orderLabel} malzeme ihtiyacı silindi, teslim alınan stokun depoya iade edilmesi gerekiyor`,
          link: `/lots/${item.lotId}`,
          entityType: 'stock-item',
          entityId: item.id,
        },
        actorId,
      );
      // Warn the warehouse responsible to expect (and weigh + re-shelve) it.
      await this.notifications.notifyUser(
        item.warehouse?.responsibleUserId,
        {
          type: NotificationType.StockReturning,
          title: 'Malzeme iadesi',
          message: `${label}: ${item.quantity} — ${orderLabel} malzeme ihtiyacı silindi, stok depoya iade ediliyor — tartılıp rafa konması gerekiyor`,
          link: `/lots/${item.lotId}`,
          entityType: 'stock-item',
          entityId: item.id,
        },
        actorId,
      );
    }
  }

  /**
   * Reserve up to `quantity` of the requirement's material for its order,
   * fanning out across the project's available stock items — racks dedicated
   * to this order first, then undedicated ones, then racks dedicated to other
   * orders (dedication is a preference, not a lock); FIFO within each group.
   * Each slice goes through the normal StockItemsService.reserve flow
   * (available → reserving, warehouse responsible notified, confirms to
   * reserved). Partial fulfilment is allowed when stock runs short; the
   * response reports what was actually reserved.
   */
  async reserveStock(
    req: OrderMaterialRequirement,
    order: Order,
    quantity: number,
    actorId?: string,
  ): Promise<{ requested: number; reserved: number; remaining: number }> {
    const candidates = await this.stockItems
      .createQueryBuilder('si')
      .innerJoinAndSelect('si.lot', 'l')
      .leftJoinAndSelect('si.rack', 'r')
      .where('l.material_id = :materialId', { materialId: req.materialId })
      .andWhere('si.status = :available', {
        available: StockItemStatus.Available,
      })
      .andWhere('l.project_id = :projectId', { projectId: order.projectId })
      .orderBy('si.createdAt', 'ASC')
      .getMany();
    // Own dedicated racks → undedicated → other orders' racks (stable sort
    // keeps FIFO within each group).
    const priority = (item: StockItem): number =>
      item.rack?.orderId === order.id ? 0 : item.rack?.orderId ? 2 : 1;
    candidates.sort((a, b) => priority(a) - priority(b));

    let remaining = round3(quantity);
    let reservedTotal = 0;
    for (const item of candidates) {
      if (remaining <= 0) break;
      const take = round3(Math.min(remaining, Number(item.quantity)));
      if (take <= 0) continue;
      await this.stockItemsService.reserve(
        item.id,
        { quantity: take, orderId: order.id },
        'ALL',
        actorId,
      );
      reservedTotal = round3(reservedTotal + take);
      remaining = round3(remaining - take);
    }
    if (reservedTotal <= 0) {
      throw new BadRequestException(
        'No available stock to reserve for this material',
      );
    }
    return {
      requested: round3(quantity),
      reserved: reservedTotal,
      remaining,
    };
  }
}

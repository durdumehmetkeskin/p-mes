import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import {
  NotificationType,
  NotificationsService,
} from '../notifications/notifications.service';
import { Order } from '../project/entities/order.entity';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { Project } from '../project/entities/project.entity';
import { ProcessStageStatus } from '../project/enums/process-stage-status.enum';
import { User } from '../users/entities/user.entity';
import { QrService } from '../qr/qr.service';
import { QrResult } from '../qr/qr.types';
import { AssignStockItemStageDto } from './dto/assign-stock-item-stage.dto';
import { CreateStockItemDto } from './dto/create-stock-item.dto';
import { ReceiveReturnDto } from './dto/receive-return.dto';
import { ReserveStockItemDto } from './dto/reserve-stock-item.dto';
import { UpdateStockItemDto } from './dto/update-stock-item.dto';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { StockItem } from './entities/stock-item.entity';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';
import { StockItemStatus } from './enums/stock-item-status.enum';
import { LotsService } from './lots.service';
import { assertProjectPlacement } from './placement.util';
import { RacksService } from './racks.service';
import { StockAlertService } from './stock-alert.service';
import {
  resolveWarehouseIds,
  WarehouseScope,
  WarehouseScopeService,
} from './warehouse-scope.service';
import { WarehousesService } from './warehouses.service';
import { StockItemsRepository } from './stock-items.repository';

@Injectable()
export class StockItemsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly stockItemsRepository: StockItemsRepository,
    private readonly lotsService: LotsService,
    private readonly warehousesService: WarehousesService,
    private readonly racksService: RacksService,
    private readonly stockAlert: StockAlertService,
    private readonly qrService: QrService,
    private readonly notifications: NotificationsService,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    @InjectRepository(Process)
    private readonly processes: Repository<Process>,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * A rich, human note for a consumption movement: which material, project,
   * order, stage and person the stock was spent on/by — each as "code · name"
   * (or number · name) rather than a bare id. Trimmed to the note column limit.
   */
  private async buildUsageNote(
    item: StockItem,
    actorName: string | null,
    prefix: string,
  ): Promise<string> {
    const project = item.lot?.projectId
      ? await this.projects.findOne({
          where: { id: item.lot.projectId },
          loadEagerRelations: false,
        })
      : null;
    const parts: string[] = [prefix];
    const m = item.lot?.material;
    if (m) parts.push(`Malzeme: ${m.code} · ${m.name}`);
    if (project) parts.push(`Proje: ${project.code} · ${project.name}`);
    if (item.order) {
      parts.push(
        `Sipariş: ${item.order.orderNumber}${item.order.name ? ` · ${item.order.name}` : ''}`,
      );
    }
    if (item.stage) parts.push(`Aşama: ${item.stage.name}`);
    if (actorName) parts.push(`Harcayan: ${actorName}`);
    parts.push(`Stok kalemi: ${item.id}`);
    return parts.join(' | ').slice(0, 500);
  }

  async create(
    dto: CreateStockItemDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<StockItem> {
    WarehouseScopeService.assertInScope(scope, dto.warehouseId);
    // Validate references exist (404 on bad ids).
    const lot = await this.lotsService.findOne(dto.lotId);
    await this.warehousesService.findOne(dto.warehouseId);
    const rack = dto.rackId
      ? await this.racksService.findOne(dto.rackId)
      : null;
    // A project's stock may only be placed in that project's zones/racks.
    assertProjectPlacement(lot, rack);

    // Merge into the slot's single available pool if one already exists.
    const existing = await this.stockItems.findOne({
      where: {
        lotId: lot.id,
        warehouseId: dto.warehouseId,
        rackId: dto.rackId ?? IsNull(),
        status: StockItemStatus.Available,
      },
      loadEagerRelations: false,
    });
    let saved: StockItem;
    if (existing) {
      existing.quantity = existing.quantity + dto.quantity;
      if (dto.note) existing.note = dto.note;
      saved = await this.stockItemsRepository.save(existing);
    } else {
      const item = this.stockItemsRepository.create({
        lotId: lot.id,
        warehouseId: dto.warehouseId,
        rackId: dto.rackId ?? null,
        quantity: dto.quantity,
        status: StockItemStatus.Available,
        note: dto.note ?? null,
      });
      saved = await this.stockItemsRepository.save(item);
    }
    await this.stockAlert.check(lot.materialId);
    return this.findOne(saved.id);
  }

  /**
   * Edit an AVAILABLE stock item: correct its quantity, move it to another
   * warehouse/rack, or change the note. Items in the reservation workflow are
   * not editable — they must go through their verbs. Moving into a slot that
   * already has an available pool merges into it (invariant: one available
   * item per (lot, warehouse, rack) slot, same as create).
   */
  async update(
    id: string,
    dto: UpdateStockItemDto,
    scope: WarehouseScope = 'ALL',
  ): Promise<StockItem> {
    const item = await this.findOne(id, scope);
    if (item.status !== StockItemStatus.Available) {
      throw new BadRequestException(
        'Only an available stock item can be edited',
      );
    }
    const warehouseId = dto.warehouseId ?? item.warehouseId;
    const rackId = dto.rackId === undefined ? item.rackId : dto.rackId;
    WarehouseScopeService.assertInScope(scope, warehouseId);
    const warehouse = await this.warehousesService.findOne(warehouseId);
    const rack = rackId ? await this.racksService.findOne(rackId) : null;
    assertProjectPlacement(item.lot, rack);

    if (dto.quantity !== undefined) item.quantity = dto.quantity;
    if (dto.note !== undefined) item.note = dto.note;

    const moved =
      warehouseId !== item.warehouseId || (rackId ?? null) !== item.rackId;
    const savedId = await this.dataSource.transaction(async (manager) => {
      if (moved) {
        // Merge into the target slot's available pool if one exists.
        const pool = await manager.findOne(StockItem, {
          where: {
            lotId: item.lotId,
            warehouseId,
            rackId: rackId ?? IsNull(),
            status: StockItemStatus.Available,
          },
          loadEagerRelations: false,
        });
        if (pool) {
          pool.quantity = pool.quantity + item.quantity;
          if (item.note) pool.note = item.note;
          await manager.save(pool);
          await manager.softRemove(item);
          return pool.id;
        }
        // Set via the relation objects (eager-relation gotcha) too.
        item.warehouse = warehouse;
        item.warehouseId = warehouseId;
        item.rack = rack;
        item.rackId = rackId ?? null;
      }
      const saved = await manager.save(item);
      return saved.id;
    });

    await this.stockAlert.check(item.lot.materialId);
    return this.findOne(savedId);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof StockItem;
    order: 'ASC' | 'DESC';
    lotId?: string;
    materialId?: string;
    projectId?: string;
    warehouseId?: string;
    orderId?: string;
    stageId?: string;
    stageUnassigned?: string;
    status?: StockItemStatus;
    scope?: WarehouseScope;
  }): Promise<[StockItem[], number]> {
    const warehouseIds = resolveWarehouseIds(
      options.scope ?? 'ALL',
      options.warehouseId,
    );
    return this.stockItemsRepository.findAndCount({ ...options, warehouseIds });
  }

  async findOne(id: string, scope: WarehouseScope = 'ALL'): Promise<StockItem> {
    const item = await this.stockItemsRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Stock item ${id} not found`);
    }
    WarehouseScopeService.assertInScope(scope, item.warehouseId);
    return item;
  }

  /**
   * Reserve part (or all) of an available stock item for an order (+ optional
   * stage): decrement the source and split off a new `reserving` item (pending
   * physical preparation), then notify the warehouse responsible to prepare it.
   */
  /** The stage must belong to the given order (stage→process→orderItem→order). */
  private async getStageForOrder(
    stageId: string,
    orderId: string,
  ): Promise<ProcessStage> {
    const stage = await this.stages
      .createQueryBuilder('s')
      .innerJoin('s.process', 'p')
      .innerJoin('p.orderItem', 'oi')
      .innerJoin('oi.order', 'o')
      // Workers power the stage-worker assignment auth (QB skips eager).
      .leftJoinAndSelect('s.workers', 'sw')
      .where('s.id = :stageId', { stageId })
      .andWhere('o.id = :orderId', { orderId })
      .getOne();
    if (!stage) {
      throw new BadRequestException('Stage does not belong to this order');
    }
    return stage;
  }

  /**
   * Assigning the order's reserved pool onto a stage is a PLANNING act:
   * only the owning process's responsible or an admin. Stage workers only
   * receive/return material already reserved for their stage.
   */
  private async assertStageAssigner(
    stage: ProcessStage,
    user: User,
  ): Promise<void> {
    if (WarehouseScopeService.isAdmin(user)) return;
    const process = await this.processes.findOne({
      where: { id: stage.processId },
    });
    if (process?.responsibleUserId === user.id) return;
    throw new ForbiddenException(
      'Stok ataması yalnızca proses sorumlusu veya admin tarafından yapılabilir.',
    );
  }

  async reserve(
    id: string,
    dto: ReserveStockItemDto,
    scope: WarehouseScope = 'ALL',
    actorId?: string,
  ): Promise<StockItem> {
    const source = await this.findOne(id, scope);
    if (source.status !== StockItemStatus.Available) {
      throw new BadRequestException(
        'Only an available stock item can be reserved',
      );
    }
    if (dto.quantity > source.quantity) {
      throw new BadRequestException(
        `Cannot reserve ${dto.quantity}: only ${source.quantity} available`,
      );
    }
    // The order must belong to the lot's project.
    if (!source.lot.projectId) {
      throw new BadRequestException(
        'This lot has no project; assign a project before reserving',
      );
    }
    const order = await this.orders.findOne({
      where: { id: dto.orderId, projectId: source.lot.projectId },
    });
    if (!order) {
      throw new BadRequestException("Order not found for this lot's project");
    }
    // Rack-order dedication is a placement preference, not a reservation lock:
    // any order of the project may draw from any of its available stock.
    if (dto.stageId) {
      await this.getStageForOrder(dto.stageId, dto.orderId);
    }

    const reservedId = await this.dataSource.transaction(async (manager) => {
      // Debit the source available item; remove it if fully consumed.
      source.quantity = source.quantity - dto.quantity;
      if (source.quantity <= 0) {
        await manager.softRemove(source);
      } else {
        await manager.save(source);
      }
      const reserved = manager.create(StockItem, {
        lotId: source.lotId,
        warehouseId: source.warehouseId,
        rackId: source.rackId,
        quantity: dto.quantity,
        status: StockItemStatus.Reserving,
        orderId: dto.orderId,
        stageId: dto.stageId ?? null,
        note: dto.note ?? null,
      });
      const savedReserved = await manager.save(reserved);
      return savedReserved.id;
    });

    // Reserving lowers the freely-available stock → may leave another order's
    // requirement uncoverable (shortage alert).
    await this.stockAlert.check(source.lot.materialId);

    // Ask the warehouse responsible to physically prepare the requested amount.
    const material = source.lot.material;
    await this.notifications.notifyUser(
      source.warehouse.responsibleUserId,
      {
        type: NotificationType.StockReserving,
        title: 'Stok hazırlığı',
        message: `${material?.code ?? ''} ${material?.name ?? ''}: ${dto.quantity} adet ${order.orderNumber} için ayrıldı — hazırlanması gerekiyor`,
        link: `/lots/${source.lotId}`,
        entityType: 'stock-item',
        entityId: reservedId,
      },
      actorId,
    );

    return this.findOne(reservedId);
  }

  /**
   * Release a reserved OR reserving item back to the available pool (merges into
   * the slot) — i.e. cancel a pending reservation or free a confirmed one.
   */
  async release(id: string, scope: WarehouseScope = 'ALL'): Promise<StockItem> {
    const reserved = await this.findOne(id, scope);
    if (
      reserved.status !== StockItemStatus.Reserved &&
      reserved.status !== StockItemStatus.Reserving
    ) {
      throw new BadRequestException(
        'Only a reserved or reserving stock item can be released',
      );
    }

    const availableId = await this.dataSource.transaction(async (manager) => {
      const pool = await manager.findOne(StockItem, {
        where: {
          lotId: reserved.lotId,
          warehouseId: reserved.warehouseId,
          rackId: reserved.rackId ?? IsNull(),
          status: StockItemStatus.Available,
        },
        loadEagerRelations: false,
      });
      if (pool) {
        pool.quantity = pool.quantity + reserved.quantity;
        await manager.save(pool);
        await manager.softRemove(reserved);
        return pool.id;
      }
      // No pool yet — flip this item back to available and clear its assignment.
      reserved.status = StockItemStatus.Available;
      reserved.orderId = null;
      reserved.order = null;
      reserved.stageId = null;
      reserved.stage = null;
      const saved = await manager.save(reserved);
      return saved.id;
    });

    return this.findOne(availableId);
  }

  /**
   * Assign (part of) an ORDER-reserved item to one of the order's stages: the
   * "order pool" (reserving/reserved, stageId NULL) feeds the stage's handover
   * flow. A partial quantity splits off a stage-bound row with the SAME status
   * (a prepared `reserved` item must not fall back to `reserving`).
   */
  async assignToStage(
    id: string,
    dto: AssignStockItemStageDto,
    user: User,
  ): Promise<StockItem> {
    const item = await this.findOne(id, 'ALL');
    if (
      item.status !== StockItemStatus.Reserving &&
      item.status !== StockItemStatus.Reserved
    ) {
      throw new BadRequestException(
        'Only a reserving or reserved stock item can be assigned to a stage',
      );
    }
    if (!item.orderId) {
      throw new BadRequestException('This item is not reserved for an order');
    }
    if (item.stageId) {
      throw new BadRequestException('This item is already assigned to a stage');
    }
    const stage = await this.getStageForOrder(dto.stageId, item.orderId);
    await this.assertStageAssigner(stage, user);

    const quantity = dto.quantity ?? item.quantity;
    if (quantity > item.quantity) {
      throw new BadRequestException(
        `Cannot assign ${quantity}: only ${item.quantity} reserved`,
      );
    }

    let resultId: string;
    if (quantity === item.quantity) {
      // Full assignment — just bind the stage (relation object + FK column).
      item.stage = stage;
      item.stageId = stage.id;
      resultId = (await this.stockItemsRepository.save(item)).id;
    } else {
      resultId = await this.dataSource.transaction(async (manager) => {
        item.quantity = item.quantity - quantity;
        await manager.save(item);
        const split = manager.create(StockItem, {
          lotId: item.lotId,
          warehouseId: item.warehouseId,
          rackId: item.rackId,
          quantity,
          status: item.status,
          orderId: item.orderId,
          stageId: stage.id,
          note: item.note,
        });
        const saved = await manager.save(split);
        return saved.id;
      });
    }

    // An already-prepared (reserved) item never passes confirmReserve again —
    // tell the stage workers/process responsible it is ready for handover now.
    if (item.status === StockItemStatus.Reserved) {
      const material = item.lot?.material;
      const input = {
        type: NotificationType.StockReserved,
        title: 'Malzeme hazır',
        message: `${material?.code ?? ''} ${material?.name ?? ''}: ${quantity} adet "${stage.name}" için hazır — teslim alınabilir`,
        link: `/lots/${item.lotId}`,
        entityType: 'stock-item',
        entityId: resultId,
      };
      for (const worker of stage.workers ?? []) {
        await this.notifications.notifyUser(worker.id, input, user.id);
      }
      const process = await this.processes.findOne({
        where: { id: stage.processId },
      });
      await this.notifications.notifyUser(
        process?.responsibleUserId,
        input,
        user.id,
      );
    }

    return this.findOne(resultId);
  }

  /**
   * Return a stage-assigned (still reserving/reserved) item to the order's
   * pool: merge into a same-status sibling at the same slot, else just clear
   * the stage binding. Reverse of `assignToStage`.
   */
  async unassignFromStage(id: string, user: User): Promise<StockItem> {
    const item = await this.findOne(id, 'ALL');
    if (
      item.status !== StockItemStatus.Reserving &&
      item.status !== StockItemStatus.Reserved
    ) {
      throw new BadRequestException(
        'Only a reserving or reserved stock item can be unassigned',
      );
    }
    if (!item.stageId || !item.stage) {
      throw new BadRequestException('This item is not bound to a stage');
    }
    await this.assertStageAssigner(item.stage, user);

    const resultId = await this.dataSource.transaction(async (manager) => {
      const sibling = await manager.findOne(StockItem, {
        where: {
          lotId: item.lotId,
          warehouseId: item.warehouseId,
          rackId: item.rackId ?? IsNull(),
          orderId: item.orderId!, // reserve() always sets orderId
          status: item.status,
          stageId: IsNull(),
        },
        loadEagerRelations: false,
      });
      if (sibling) {
        sibling.quantity = sibling.quantity + item.quantity;
        await manager.save(sibling);
        await manager.softRemove(item);
        return sibling.id;
      }
      item.stageId = null;
      item.stage = null;
      const saved = await manager.save(item);
      return saved.id;
    });

    return this.findOne(resultId);
  }

  /**
   * All non-consumed reservation statuses — stock that is committed to an order/
   * stage but not yet issued out, and so must return to available when the
   * order/stage it is bound to is deleted.
   */
  private static readonly NON_CONSUMED_RESERVED = [
    StockItemStatus.Reserving,
    StockItemStatus.Reserved,
    StockItemStatus.Delivering,
    StockItemStatus.Delivered,
    StockItemStatus.Returning,
  ];

  /**
   * Return a single reserved item to the available pool within an existing
   * transaction — merges its quantity into the matching available slot, else
   * flips it to available and clears its order/stage assignment. Used by the
   * bulk order/stage release paths below (leaf-first delete).
   */
  private async releaseReservedItem(
    manager: EntityManager,
    reserved: StockItem,
  ): Promise<void> {
    const pool = await manager.findOne(StockItem, {
      where: {
        lotId: reserved.lotId,
        warehouseId: reserved.warehouseId,
        rackId: reserved.rackId ?? IsNull(),
        status: StockItemStatus.Available,
      },
      loadEagerRelations: false,
    });
    if (pool) {
      pool.quantity = pool.quantity + reserved.quantity;
      await manager.save(pool);
      await manager.softRemove(reserved);
      return;
    }
    reserved.status = StockItemStatus.Available;
    reserved.orderId = null;
    reserved.order = null;
    reserved.stageId = null;
    reserved.stage = null;
    await manager.save(reserved);
  }

  /**
   * Release every non-consumed reserved item bound to an order back to available
   * (order deletion). Runs inside the caller's transaction.
   */
  async releaseAllForOrder(
    orderId: string,
    manager: EntityManager,
  ): Promise<void> {
    const items = await manager.find(StockItem, {
      where: {
        orderId,
        status: In(StockItemsService.NON_CONSUMED_RESERVED),
      },
      loadEagerRelations: false,
    });
    for (const item of items) {
      await this.releaseReservedItem(manager, item);
    }
  }

  /**
   * Release every non-consumed reserved item bound to a stage back to available
   * (stage deletion). Runs inside the caller's transaction.
   */
  async releaseAllForStage(
    stageId: string,
    manager: EntityManager,
  ): Promise<void> {
    const items = await manager.find(StockItem, {
      where: {
        stageId,
        status: In(StockItemsService.NON_CONSUMED_RESERVED),
      },
      loadEagerRelations: false,
    });
    for (const item of items) {
      await this.releaseReservedItem(manager, item);
    }
  }

  /**
   * Release everything held for one (order, material) pair — used when the
   * order's material requirement is deleted. Items still in the warehouse
   * (reserving/reserved) merge straight back into the available pool; items
   * already handed out (delivering/delivered) flip to `returning` so the
   * physical stock walks back through the normal receive-return flow. Items
   * already `returning` are left alone (they end up available anyway). Runs
   * inside the caller's transaction; returns the items flipped to `returning`
   * so the caller can ask their holders to bring them back after commit.
   */
  async releaseForOrderMaterial(
    orderId: string,
    materialId: string,
    manager: EntityManager,
  ): Promise<StockItem[]> {
    const items = await manager.find(StockItem, {
      where: {
        orderId,
        lot: { materialId },
        status: In([
          StockItemStatus.Reserving,
          StockItemStatus.Reserved,
          StockItemStatus.Delivering,
          StockItemStatus.Delivered,
        ]),
      },
    });
    const returning: StockItem[] = [];
    for (const item of items) {
      if (
        item.status === StockItemStatus.Reserving ||
        item.status === StockItemStatus.Reserved
      ) {
        await this.releaseReservedItem(manager, item);
        continue;
      }
      item.status = StockItemStatus.Returning;
      await manager.save(item);
      returning.push(item);
    }
    return returning;
  }

  /**
   * Confirm a `reserving` item → `reserved`: the warehouse responsible has
   * physically prepared the requested amount. Warehouse-scoped in the controller.
   */
  async confirmReserve(
    id: string,
    scope: WarehouseScope = 'ALL',
    actorId?: string,
  ): Promise<StockItem> {
    const item = await this.findOne(id, scope);
    if (item.status !== StockItemStatus.Reserving) {
      throw new BadRequestException(
        'Only a reserving stock item can be confirmed',
      );
    }
    item.status = StockItemStatus.Reserved;
    await this.stockItemsRepository.save(item);

    // Material prepared → alert the stage workers + the process responsible.
    if (item.stageId) {
      const material = item.lot?.material;
      const input = {
        type: NotificationType.StockReserved,
        title: 'Malzeme hazır',
        message: `${material?.code ?? ''} ${material?.name ?? ''}: ${item.quantity} adet "${item.stage?.name ?? 'aşama'}" için hazır — teslim alınabilir`,
        link: `/lots/${item.lotId}`,
        entityType: 'stock-item',
        entityId: item.id,
      };
      for (const worker of item.stage?.workers ?? []) {
        await this.notifications.notifyUser(worker.id, input, actorId);
      }
      const process = item.stage?.processId
        ? await this.processes.findOne({ where: { id: item.stage.processId } })
        : null;
      await this.notifications.notifyUser(
        process?.responsibleUserId,
        input,
        actorId,
      );
    }

    return this.findOne(id);
  }

  /**
   * Warehouse hands over a prepared (reserved) item: mark it `delivering` and
   * record the deliverer + time. A stage worker receives it next.
   */
  async deliver(
    id: string,
    scope: WarehouseScope = 'ALL',
    actorId?: string,
  ): Promise<StockItem> {
    const item = await this.findOne(id, scope);
    if (item.status !== StockItemStatus.Reserved) {
      throw new BadRequestException(
        'Only a reserved stock item can be delivered',
      );
    }
    item.status = StockItemStatus.Delivering;
    item.deliveredByUserId = actorId ?? null;
    item.deliveredAt = new Date();
    await this.stockItemsRepository.save(item);
    return this.findOne(id);
  }

  /**
   * A stage worker receives a handed-over item: mark it `delivered`, record
   * the receiver + time, and post a `handover` movement to the ledger (who
   * delivered/received + dates). Only a stage worker or an admin may.
   */
  async receive(id: string, user: User): Promise<StockItem> {
    const item = await this.findOne(id, 'ALL');
    if (item.status !== StockItemStatus.Delivering) {
      throw new BadRequestException(
        'Only a delivering stock item can be received',
      );
    }
    if (!item.stageId) {
      throw new BadRequestException('This item is not bound to a stage');
    }
    if (
      !WarehouseScopeService.isAdmin(user) &&
      !(item.stage?.workers ?? []).some((w) => w.id === user.id)
    ) {
      throw new ForbiddenException('Only a stage worker can receive');
    }

    await this.dataSource.transaction(async (manager) => {
      item.status = StockItemStatus.Delivered;
      item.receivedByUserId = user.id;
      item.receivedAt = new Date();
      await manager.save(item);

      const tx = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.Handover,
        materialId: item.lot.materialId,
        quantity: item.quantity,
        note: `Handover of stock item ${item.id} to stage`,
        sourceWarehouseId: item.warehouseId,
        sourceRackId: item.rackId,
        sourceLotId: item.lotId,
        orderId: item.orderId,
        stageId: item.stageId,
        deliveredByUserId: item.deliveredByUserId,
        deliveredAt: item.deliveredAt,
        receivedByUserId: item.receivedByUserId,
        receivedAt: item.receivedAt,
      });
      await manager.save(tx);
    });

    return this.findOne(id);
  }

  /**
   * The stage hands leftover material back to the warehouse (scanned): mark the
   * delivered item `returning` and record who returned it + when. Only allowed
   * once the stage is completed. The warehouse responsible re-receives it next.
   * Authorized for a stage worker or an admin (mirrors `receive`).
   */
  async returnToWarehouse(id: string, user: User): Promise<StockItem> {
    const item = await this.findOne(id, 'ALL');
    if (item.status !== StockItemStatus.Delivered) {
      throw new BadRequestException(
        'Only a delivered stock item can be returned',
      );
    }
    if (!item.stageId) {
      throw new BadRequestException('This item is not bound to a stage');
    }
    if (item.stage?.status !== ProcessStageStatus.Completed) {
      throw new BadRequestException(
        'The stage must be completed before returning leftover material',
      );
    }
    if (
      !WarehouseScopeService.isAdmin(user) &&
      !(item.stage?.workers ?? []).some((w) => w.id === user.id)
    ) {
      throw new ForbiddenException('Only a stage worker can return');
    }

    item.status = StockItemStatus.Returning;
    item.returnedByUserId = user.id;
    item.returnedAt = new Date();
    await this.stockItemsRepository.save(item);

    // Ask the warehouse responsible to weigh + re-shelve the returned leftover.
    const material = item.lot?.material;
    await this.notifications.notifyUser(
      item.warehouse?.responsibleUserId,
      {
        type: NotificationType.StockReturning,
        title: 'Malzeme iadesi',
        message: `${material?.code ?? ''} ${material?.name ?? ''}: "${item.stage?.name ?? 'aşama'}" kalanı depoya iade ediliyor — tartılıp rafa konması gerekiyor`,
        link: `/lots/${item.lotId}`,
        entityType: 'stock-item',
        entityId: item.id,
      },
      user.id,
    );

    return this.findOne(id);
  }

  /**
   * The warehouse responsible re-receives a returning item (scanned): weighs the
   * leftover (`quantity`) and puts it back on `rackId`, returning it to the
   * available pool (merging into the slot). Records a `return` movement carrying
   * the returner (stage) + receiver (warehouse) + dates, and — if less came back
   * than was delivered — an OUT for the amount used at the stage.
   */
  async receiveReturn(
    id: string,
    dto: ReceiveReturnDto,
    scope: WarehouseScope = 'ALL',
    actorId?: string,
  ): Promise<StockItem> {
    const item = await this.findOne(id, scope);
    if (item.status !== StockItemStatus.Returning) {
      throw new BadRequestException(
        'Only a returning stock item can be re-received',
      );
    }
    if (dto.quantity > item.quantity) {
      throw new BadRequestException(
        `Returned quantity (${dto.quantity}) exceeds the delivered amount (${item.quantity})`,
      );
    }
    const rack = await this.racksService.findOne(dto.rackId);
    if (rack.zone?.warehouseId !== item.warehouseId) {
      throw new BadRequestException("The rack is not in this item's warehouse");
    }
    // A project's stock may only be re-shelved into that project's racks.
    assertProjectPlacement(item.lot, rack);

    const deliveredQty = item.quantity;
    const usedAtStage = deliveredQty - dto.quantity;
    // The portion used at the stage was spent by whoever returned it (stage side).
    const returner = item.returnedByUserId
      ? await this.users.findOne({
          where: { id: item.returnedByUserId },
          loadEagerRelations: false,
        })
      : null;
    const usedNote =
      usedAtStage > 0
        ? await this.buildUsageNote(
            item,
            returner?.name ?? null,
            'Aşamada kullanıldı',
          )
        : null;

    const availableId = await this.dataSource.transaction(async (manager) => {
      // Ledger: the leftover coming back into the warehouse/rack.
      const returnTx = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.Return,
        materialId: item.lot.materialId,
        quantity: dto.quantity,
        note: `Return of stock item ${item.id} to warehouse`,
        targetWarehouseId: item.warehouseId,
        targetRackId: dto.rackId,
        targetLotId: item.lotId,
        orderId: item.orderId,
        stageId: item.stageId,
        deliveredByUserId: item.returnedByUserId,
        deliveredAt: item.returnedAt,
        receivedByUserId: actorId ?? null,
        receivedAt: new Date(),
      });
      await manager.save(returnTx);

      // Ledger: the portion actually used at the stage leaves stock for good.
      if (usedAtStage > 0) {
        const outTx = manager.create(InventoryTransaction, {
          type: InventoryTransactionType.Out,
          materialId: item.lot.materialId,
          quantity: usedAtStage,
          note: usedNote,
          sourceWarehouseId: item.warehouseId,
          sourceRackId: item.rackId,
          sourceLotId: item.lotId,
          orderId: item.orderId,
          stageId: item.stageId,
        });
        await manager.save(outTx);
      }

      // Return the weighed leftover to the available pool at the chosen rack.
      const pool = await manager.findOne(StockItem, {
        where: {
          lotId: item.lotId,
          warehouseId: item.warehouseId,
          rackId: dto.rackId,
          status: StockItemStatus.Available,
        },
        loadEagerRelations: false,
      });
      if (pool) {
        pool.quantity = pool.quantity + dto.quantity;
        await manager.save(pool);
        await manager.softRemove(item);
        return pool.id;
      }
      // No pool at that slot — flip this item back to available and reset it.
      item.status = StockItemStatus.Available;
      item.quantity = dto.quantity;
      item.rackId = dto.rackId;
      item.rack = rack;
      item.orderId = null;
      item.order = null;
      item.stageId = null;
      item.stage = null;
      item.deliveredByUserId = null;
      item.deliveredAt = null;
      item.receivedByUserId = null;
      item.receivedAt = null;
      item.returnedByUserId = null;
      item.returnedAt = null;
      const saved = await manager.save(item);
      return saved.id;
    });

    await this.stockAlert.check(item.lot.materialId);
    return this.findOne(availableId);
  }

  /**
   * Consume a stock item (issue it out): mark it consumed and record an OUT
   * movement so the immutable ledger stays truthful.
   */
  async consume(
    id: string,
    scope: WarehouseScope = 'ALL',
    actor?: User,
  ): Promise<StockItem> {
    const item = await this.findOne(id, scope);
    if (item.status === StockItemStatus.Consumed) {
      throw new BadRequestException('Stock item is already consumed');
    }
    const note = await this.buildUsageNote(
      item,
      actor?.name ?? null,
      'Harcandı',
    );

    await this.dataSource.transaction(async (manager) => {
      item.status = StockItemStatus.Consumed;
      await manager.save(item);

      const tx = manager.create(InventoryTransaction, {
        type: InventoryTransactionType.Out,
        materialId: item.lot.materialId,
        quantity: item.quantity,
        note,
        sourceWarehouseId: item.warehouseId,
        sourceRackId: item.rackId,
        sourceLotId: item.lotId,
        orderId: item.orderId,
        stageId: item.stageId,
      });
      await manager.save(tx);
    });

    await this.stockAlert.check(item.lot.materialId);
    return this.findOne(item.id);
  }

  async remove(id: string, scope: WarehouseScope = 'ALL'): Promise<void> {
    const item = await this.findOne(id, scope);
    await this.stockItemsRepository.softRemove(item);
  }

  /**
   * Generate a QR code (PNG) for a stock item. Encodes the item id + its lot
   * number; scanning deep-links to the lot page that lists the item.
   */
  async generateQr(
    id: string,
    scope: WarehouseScope = 'ALL',
  ): Promise<QrResult> {
    const item = await this.findOne(id, scope);
    const code = item.lot?.lotNumber ?? item.id;
    const payload = this.qrService.buildPayload(
      'stock-item',
      item.id,
      code,
      `/lots/${item.lotId}`,
    );
    const buffer = await this.qrService.toPng(payload);
    return {
      fileName: this.qrService.fileName('stock-item', code),
      buffer,
    };
  }
}

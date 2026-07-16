import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';
import { describeMovementEndpoints } from '../inventory/movement-endpoints.util';
import { Lot } from '../inventory/entities/lot.entity';
import { Material } from '../inventory/entities/material.entity';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { StockItemStatus } from '../inventory/enums/stock-item-status.enum';
import { Tool } from '../tooling/entities/tool.entity';
import { OrderMaterialRequirement } from './entities/order-material-requirement.entity';
import { ProjectMaterialReorder } from './entities/project-material-reorder.entity';

/** One order's uncovered need of a material (demand-list child row). */
export interface MaterialDemandOrderRow {
  orderId: string;
  orderNumber: string;
  orderName: string | null;
  required: number;
  covered: number;
  remaining: number;
}

/**
 * A material whose total uncovered need across the project's orders exceeds
 * the project's freely-available stock (demand-list parent row).
 */
export interface MaterialDemandRow {
  materialId: string;
  code: string;
  name: string;
  unit: string;
  requiredTotal: number;
  remainingTotal: number;
  /** The project's freely-available stock of the material. */
  available: number;
  missing: number;
  orders: MaterialDemandOrderRow[];
}

/** Statuses that count as "held for the order" toward a requirement. */
const COVERED_STATUSES = [
  StockItemStatus.Reserving,
  StockItemStatus.Reserved,
  StockItemStatus.Delivering,
  StockItemStatus.Delivered,
];

const round3 = (v: number): number => Math.round(v * 1000) / 1000;

export interface ProjectMaterialRow {
  id: string;
  code: string;
  name: string;
  unit: string;
  // Stock allocated to this project (SUM of stock items whose lot or reserving
  // order belongs to the project) — available + reserved.
  quantity: number;
  // Of that, the freely-available portion (status = available only).
  available: number;
  // Per-project reorder (critical-stock) level, or null if none is set.
  reorderLevel: number | null;
}

interface ProjectStockItemView {
  id: string;
  quantity: number;
  status: string;
  warehouse: string | null;
  rack: string | null;
  order: string | null;
  stage: string | null;
}
interface ProjectLotView {
  id: string;
  lotNumber: string;
  expiryDate: string | null;
  status: string;
  stockItems: ProjectStockItemView[];
}
interface ProjectMovementView {
  id: string;
  type: string;
  quantity: number;
  createdAt: Date;
  note: string | null;
  source: string | null;
  target: string | null;
  from: string;
  fromKind: string;
  to: string;
  toKind: string;
}
export interface ProjectMaterialDetail {
  material: {
    id: string;
    code: string;
    name: string;
    unit: string;
    description: string | null;
  };
  reorderLevel: number | null;
  lots: ProjectLotView[];
  movements: ProjectMovementView[];
}

/**
 * Materials and tools allocated to a project. A material counts if it has a
 * lot allocated to the project or stock reserved for the project's orders
 * (materials themselves are customer/project-agnostic — the link lives on the
 * lot). A tool counts if it's assigned to the project or sits in the project's
 * zones/racks (incl. order-dedicated racks).
 */
@Injectable()
export class ProjectAllocationsService {
  constructor(
    @InjectRepository(Material)
    private readonly materials: Repository<Material>,
    @InjectRepository(Lot)
    private readonly lots: Repository<Lot>,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    @InjectRepository(Tool)
    private readonly tools: Repository<Tool>,
    @InjectRepository(InventoryTransaction)
    private readonly transactions: Repository<InventoryTransaction>,
    @InjectRepository(OrderMaterialRequirement)
    private readonly requirements: Repository<OrderMaterialRequirement>,
    @InjectRepository(ProjectMaterialReorder)
    private readonly reorders: Repository<ProjectMaterialReorder>,
  ) {}

  /**
   * Demand list: materials whose total uncovered need across the project's
   * orders exceeds the project's freely-available stock. The stock pool is
   * shared per project (rack-order dedication is a placement preference, not
   * a reservation lock), so per material:
   *   missing = max(0, Σ(order remaining) − available)
   * where an order's remaining = requiredQuantity minus what is already held
   * for it (reserving/reserved/delivering/delivered). Only materials with
   * missing > 0 are returned; `orders` breaks the need down per order.
   */
  async materialDemandsForProject(
    projectId: string,
  ): Promise<MaterialDemandRow[]> {
    // Every requirement of the project's orders (QB skips eager relations —
    // join the order and material explicitly).
    const reqs = await this.requirements
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.order', 'o')
      .innerJoinAndSelect('r.material', 'm')
      .leftJoinAndSelect('m.materialUnit', 'mu')
      .where('o.project_id = :p', { p: projectId })
      .andWhere('r.required_quantity > 0')
      .getMany();
    if (!reqs.length) return [];
    const orderIds = [...new Set(reqs.map((r) => r.orderId))];
    const materialIds = [...new Set(reqs.map((r) => r.materialId))];

    // Stock already held per (order, material).
    const held = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .select('si.orderId', 'orderId')
      .addSelect('l.materialId', 'materialId')
      .addSelect('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('si.orderId IN (:...orderIds)', { orderIds })
      .andWhere('l.materialId IN (:...materialIds)', { materialIds })
      .andWhere('si.status IN (:...covered)', { covered: COVERED_STATUSES })
      .groupBy('si.orderId')
      .addGroupBy('l.materialId')
      .getRawMany<{ orderId: string; materialId: string; sum: string }>();
    const coveredByOrderMaterial = new Map(
      held.map((h) => [`${h.orderId}:${h.materialId}`, Number(h.sum)]),
    );

    // Freely-available project stock per material (shared pool — rack-order
    // dedication does not limit who may reserve).
    const avail = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .leftJoin('si.order', 'o')
      .select('l.materialId', 'materialId')
      .addSelect('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('l.materialId IN (:...materialIds)', { materialIds })
      .andWhere('si.status = :available', {
        available: StockItemStatus.Available,
      })
      .andWhere('(l.projectId = :p OR o.projectId = :p)', { p: projectId })
      .groupBy('l.materialId')
      .getRawMany<{ materialId: string; sum: string }>();
    const availableByMaterial = new Map(
      avail.map((a) => [a.materialId, Number(a.sum)]),
    );

    const byMaterial = new Map<string, MaterialDemandRow>();
    for (const r of reqs) {
      const covered =
        coveredByOrderMaterial.get(`${r.orderId}:${r.materialId}`) ?? 0;
      const remaining = Math.max(0, round3(r.requiredQuantity - covered));
      let row = byMaterial.get(r.materialId);
      if (!row) {
        row = {
          materialId: r.materialId,
          code: r.material.code,
          name: r.material.name,
          unit: r.material.materialUnit?.name ?? '',
          requiredTotal: 0,
          remainingTotal: 0,
          available: availableByMaterial.get(r.materialId) ?? 0,
          missing: 0,
          orders: [],
        };
        byMaterial.set(r.materialId, row);
      }
      row.requiredTotal = round3(row.requiredTotal + r.requiredQuantity);
      row.remainingTotal = round3(row.remainingTotal + remaining);
      if (remaining > 0) {
        row.orders.push({
          orderId: r.orderId,
          orderNumber: r.order.orderNumber,
          orderName: r.order.name ?? null,
          required: r.requiredQuantity,
          covered,
          remaining,
        });
      }
    }

    return [...byMaterial.values()]
      .map((row) => ({
        ...row,
        missing: Math.max(0, round3(row.remainingTotal - row.available)),
        orders: row.orders.sort((a, b) =>
          a.orderNumber.localeCompare(b.orderNumber, 'tr'),
        ),
      }))
      .filter((row) => row.missing > 0)
      .sort((a, b) => a.code.localeCompare(b.code, 'tr'));
  }

  async materialsForProject(projectId: string): Promise<ProjectMaterialRow[]> {
    // Stock allocated to the project, summed per material (lot's project or the
    // reserving order's project = this project).
    const sums = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .leftJoin('si.order', 'o')
      .select('l.materialId', 'materialId')
      .addSelect('COALESCE(SUM(si.quantity), 0)', 'qty')
      .addSelect(
        'COALESCE(SUM(CASE WHEN si.status = :available THEN si.quantity ELSE 0 END), 0)',
        'avail',
      )
      .where('si.status != :consumed', {
        consumed: StockItemStatus.Consumed,
      })
      .andWhere('(l.projectId = :p OR o.projectId = :p)', { p: projectId })
      .setParameter('available', StockItemStatus.Available)
      .groupBy('l.materialId')
      .getRawMany<{ materialId: string; qty: string; avail: string }>();
    const qtyByMaterial = new Map(
      sums.map((s) => [s.materialId, Number(s.qty)]),
    );
    const availByMaterial = new Map(
      sums.map((s) => [s.materialId, Number(s.avail)]),
    );

    // Union of allocated material ids: lot-allocated or stock-allocated.
    const ids = new Set<string>(qtyByMaterial.keys());
    const projLots = await this.lots.find({
      where: { projectId },
      select: { materialId: true },
    });
    projLots.forEach((l) => ids.add(l.materialId));

    if (!ids.size) return [];
    const materials = await this.materials.find({
      where: { id: In([...ids]) },
      order: { code: 'ASC' },
    });
    // Per-project reorder levels for the material set.
    const reorderRows = await this.reorders.find({
      where: { projectId, materialId: In([...ids]) },
      loadEagerRelations: false,
    });
    const reorderByMaterial = new Map(
      reorderRows.map((r) => [r.materialId, r.reorderLevel]),
    );
    return materials.map((m) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      unit: m.materialUnit?.name ?? '',
      quantity: qtyByMaterial.get(m.id) ?? 0,
      available: availByMaterial.get(m.id) ?? 0,
      reorderLevel: reorderByMaterial.get(m.id) ?? null,
    }));
  }

  toolsForProject(projectId: string): Promise<Tool[]> {
    return this.tools
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.rack', 'r')
      .leftJoin('r.zone', 'z')
      .leftJoin('r.order', 'o')
      .where('t.projectId = :p OR z.projectId = :p OR o.projectId = :p', {
        p: projectId,
      })
      .orderBy('t.code', 'ASC')
      .getMany();
  }

  /**
   * Project-scoped material detail: only this project's lots of the material,
   * their stock items (with rack/status/order), and the movements involving
   * those lots. Everything is confined to the project's own lots.
   */
  async materialDetailForProject(
    projectId: string,
    materialId: string,
  ): Promise<ProjectMaterialDetail> {
    const material = await this.materials.findOne({
      where: { id: materialId },
      relations: { materialUnit: true },
      loadEagerRelations: false,
    });
    if (!material) {
      throw new NotFoundException(`Material ${materialId} not found`);
    }

    const lots = await this.lots.find({
      where: { materialId, projectId },
      order: { lotNumber: 'ASC' },
      loadEagerRelations: false,
    });
    const lotIds = lots.map((l) => l.id);

    const items = lotIds.length
      ? await this.stockItems.find({
          where: { lotId: In(lotIds) },
          relations: {
            warehouse: true,
            rack: true,
            order: true,
            stage: true,
          },
          loadEagerRelations: false,
          order: { createdAt: 'ASC' },
        })
      : [];
    const itemsByLot = new Map<string, ProjectStockItemView[]>();
    for (const si of items) {
      const view: ProjectStockItemView = {
        id: si.id,
        quantity: si.quantity,
        status: si.status,
        warehouse: si.warehouse?.code ?? null,
        rack: si.rack?.code ?? null,
        order: si.order?.orderNumber ?? null,
        stage: si.stage?.name ?? null,
      };
      const list = itemsByLot.get(si.lotId);
      if (list) list.push(view);
      else itemsByLot.set(si.lotId, [view]);
    }

    const movements = lotIds.length
      ? await this.transactions.find({
          where: [{ sourceLotId: In(lotIds) }, { targetLotId: In(lotIds) }],
          relations: {
            sourceWarehouse: true,
            sourceRack: true,
            targetWarehouse: true,
            targetRack: true,
            deliveredByUser: true,
            receivedByUser: true,
          },
          loadEagerRelations: false,
          order: { createdAt: 'DESC' },
          take: 50,
        })
      : [];
    const slot = (
      wh?: { code?: string } | null,
      rk?: { code?: string } | null,
    ) => [wh?.code, rk?.code].filter(Boolean).join(' / ') || null;

    const reorder = await this.reorders.findOne({
      where: { projectId, materialId },
      loadEagerRelations: false,
    });

    return {
      material: {
        id: material.id,
        code: material.code,
        name: material.name,
        unit: material.materialUnit?.name ?? '',
        description: material.description,
      },
      reorderLevel: reorder?.reorderLevel ?? null,
      lots: lots.map((l) => ({
        id: l.id,
        lotNumber: l.lotNumber,
        expiryDate: l.expiryDate,
        status: l.status,
        stockItems: itemsByLot.get(l.id) ?? [],
      })),
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        quantity: m.quantity,
        createdAt: m.createdAt,
        note: m.note,
        source: slot(m.sourceWarehouse, m.sourceRack),
        target: slot(m.targetWarehouse, m.targetRack),
        ...describeMovementEndpoints(m),
      })),
    };
  }
}

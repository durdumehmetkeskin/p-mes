import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { Lot } from './entities/lot.entity';
import { StockItem } from './entities/stock-item.entity';
import { StockItemStatus } from './enums/stock-item-status.enum';

@Injectable()
export class StockItemsRepository {
  constructor(
    @InjectRepository(StockItem)
    private readonly repo: Repository<StockItem>,
  ) {}

  create(data: Partial<StockItem>): StockItem {
    return this.repo.create(data);
  }

  save(item: StockItem): Promise<StockItem> {
    return this.repo.save(item);
  }

  // Only the relations the UI/services actually read — NOT the full eager tree
  // (which pulls project.managerUser → user.roles etc. at many points and
  // cartesian-explodes the query). loadEagerRelations:false keeps these shallow,
  // so lot.project / zone.project add no eager blow-up. The zone/project chain
  // powers the warehouse hub's "which zone / project / rack / order" drill-in.
  private static readonly RELATIONS = {
    lot: { material: true, project: true },
    warehouse: true,
    rack: { order: true, zone: { project: true } },
    order: true,
    // Workers power the stage-worker handover auth (receive/return/unassign).
    stage: { workers: true },
  } as const;

  findById(id: string): Promise<StockItem | null> {
    return this.repo.findOne({
      where: { id },
      relations: StockItemsRepository.RELATIONS,
      loadEagerRelations: false,
    });
  }

  findAndCount(options: {
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
    /** 'true' → only items not yet assigned to any stage. */
    stageUnassigned?: string;
    status?: StockItemStatus;
    // Warehouse-responsible scoping. An empty array matches nothing.
    warehouseIds?: string[];
  }): Promise<[StockItem[], number]> {
    const where: FindOptionsWhere<StockItem> = {};
    if (options.lotId) where.lotId = options.lotId;
    if (options.orderId) where.orderId = options.orderId;
    if (options.stageId) where.stageId = options.stageId;
    else if (options.stageUnassigned === 'true') where.stageId = IsNull();
    if (options.status) where.status = options.status;
    if (options.warehouseIds !== undefined) {
      where.warehouseId = In(options.warehouseIds);
    } else if (options.warehouseId) {
      where.warehouseId = options.warehouseId;
    }
    // material / project live on the parent lot.
    const lotWhere: FindOptionsWhere<Lot> = {};
    if (options.materialId) lotWhere.materialId = options.materialId;
    if (options.projectId) lotWhere.projectId = options.projectId;
    if (Object.keys(lotWhere).length) where.lot = lotWhere;

    return this.repo.findAndCount({
      where,
      relations: StockItemsRepository.RELATIONS,
      loadEagerRelations: false,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(item: StockItem): Promise<StockItem> {
    return this.repo.softRemove(item);
  }
}

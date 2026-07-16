import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';

@Injectable()
export class InventoryTransactionsRepository {
  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly repo: Repository<InventoryTransaction>,
  ) {}

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof InventoryTransaction;
    order: 'ASC' | 'DESC';
    type?: InventoryTransactionType;
    materialId?: string;
    warehouseId?: string;
    // Warehouse-responsible scoping: match movements whose source OR target
    // warehouse is in this set. An empty array matches nothing.
    warehouseIds?: string[];
  }): Promise<[InventoryTransaction[], number]> {
    const base: FindOptionsWhere<InventoryTransaction> = {};
    if (options.type) base.type = options.type;
    if (options.materialId) base.materialId = options.materialId;

    // A movement touches a warehouse on either its source or target leg, so the
    // warehouse filter must be an OR across both columns.
    let where:
      | FindOptionsWhere<InventoryTransaction>
      | FindOptionsWhere<InventoryTransaction>[] = base;
    if (options.warehouseIds !== undefined) {
      where = [
        { ...base, sourceWarehouseId: In(options.warehouseIds) },
        { ...base, targetWarehouseId: In(options.warehouseIds) },
      ];
    } else if (options.warehouseId) {
      where = [
        { ...base, sourceWarehouseId: options.warehouseId },
        { ...base, targetWarehouseId: options.warehouseId },
      ];
    }

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
      // Handover/return rows carry the person counterparty (not eager).
      relations: { deliveredByUser: true, receivedByUser: true },
    });
  }

  findById(id: string): Promise<InventoryTransaction | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Both legs of a transfer sharing a group id (chronological order). */
  findByGroup(groupId: string): Promise<InventoryTransaction[]> {
    return this.repo.find({
      where: { transferGroupId: groupId },
      order: { createdAt: 'ASC' },
    });
  }
}

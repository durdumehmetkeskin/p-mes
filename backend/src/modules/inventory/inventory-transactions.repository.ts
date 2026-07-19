import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';

@Injectable()
export class InventoryTransactionsRepository {
  constructor(
    @InjectRepository(InventoryTransaction)
    private readonly repo: Repository<InventoryTransaction>,
  ) {}

  async findAndCount(options: {
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
    if (
      options.warehouseIds !== undefined &&
      options.warehouseIds.length === 0
    ) {
      return [[], 0];
    }

    // The list is served by an explicit QueryBuilder instead of find(): the
    // entity's eager relations cascade (Lot→Project→Customer/Contact,
    // Warehouse→User→Roles, Rack→Zone→…) into a huge join tree, and the
    // eager ManyToMany (user roles) forces TypeORM into its slow
    // distinct-id pagination mode. Here we join only the flat ManyToOnes the
    // list actually renders, so pagination is a plain LIMIT/OFFSET.
    const applyFilters = (
      qb: SelectQueryBuilder<InventoryTransaction>,
    ): SelectQueryBuilder<InventoryTransaction> => {
      if (options.type) {
        qb.andWhere('tx.type = :type', { type: options.type });
      }
      if (options.materialId) {
        qb.andWhere('tx.materialId = :materialId', {
          materialId: options.materialId,
        });
      }
      // A movement touches a warehouse on either its source or target leg, so
      // the warehouse filter must be an OR across both columns.
      if (options.warehouseIds !== undefined) {
        qb.andWhere(
          '(tx.sourceWarehouseId IN (:...whIds) OR tx.targetWarehouseId IN (:...whIds))',
          { whIds: options.warehouseIds },
        );
      } else if (options.warehouseId) {
        qb.andWhere(
          '(tx.sourceWarehouseId = :whId OR tx.targetWarehouseId = :whId)',
          { whId: options.warehouseId },
        );
      }
      return qb;
    };

    const dataQb = applyFilters(
      this.repo
        .createQueryBuilder('tx')
        .leftJoinAndSelect('tx.material', 'material')
        .leftJoinAndSelect('material.materialUnit', 'materialUnit')
        .leftJoinAndSelect('material.materialType', 'materialType')
        .leftJoinAndSelect('tx.sourceWarehouse', 'sourceWarehouse')
        .leftJoinAndSelect('tx.sourceRack', 'sourceRack')
        .leftJoinAndSelect('tx.sourceLot', 'sourceLot')
        .leftJoinAndSelect('tx.targetWarehouse', 'targetWarehouse')
        .leftJoinAndSelect('tx.targetRack', 'targetRack')
        .leftJoinAndSelect('tx.targetLot', 'targetLot')
        // Handover/return rows carry the person counterparty — only the
        // display fields, never the credential/role payload.
        .leftJoin('tx.deliveredByUser', 'deliveredByUser')
        .addSelect(['deliveredByUser.id', 'deliveredByUser.name'])
        .leftJoin('tx.receivedByUser', 'receivedByUser')
        .addSelect(['receivedByUser.id', 'receivedByUser.name']),
    ).orderBy(`tx.${options.sort}`, options.order);

    // Flat ManyToOne joins keep one row per movement, so raw OFFSET/LIMIT is
    // safe (no TypeORM skip/take id-subquery) and the count needs no joins.
    if (options.skip) dataQb.offset(options.skip);
    if (options.take !== undefined) dataQb.limit(options.take);

    const countQb = applyFilters(this.repo.createQueryBuilder('tx'));

    return Promise.all([dataQb.getMany(), countQb.getCount()]);
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

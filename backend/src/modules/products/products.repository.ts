import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  create(data: Partial<Product>): Product {
    return this.repo.create(data);
  }

  save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  /** Record the persistent QR object's key (targeted update, no full save). */
  async updateQrObjectKey(id: string, key: string): Promise<void> {
    await this.repo.update(id, { qrObjectKey: key });
  }

  /**
   * Paginated list via QueryBuilder (eager relations don't auto-load here, so
   * every display relation is joined explicitly — all ManyToOne, no fan-out).
   * `memberProjectIds` (non-admin scoping): products whose origin order belongs
   * to one of these projects, plus origin-less products, are visible.
   */
  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Product;
    order: 'ASC' | 'DESC';
    q?: string;
    orderId?: string;
    processId?: string;
    stageId?: string;
    productTypeId?: string;
    storageId?: string;
    storageRackId?: string;
    consumedByStageId?: string;
    consumedByProcessId?: string;
    /** 'true' → only products not yet used as any stage's input. */
    unconsumed?: string;
    memberProjectIds?: string[];
  }): Promise<[Product[], number]> {
    const qb: SelectQueryBuilder<Product> = this.repo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.productType', 'productType')
      .leftJoinAndSelect('product.materialUnit', 'materialUnit')
      // Alias 'ord' — 'order' is an SQL keyword and raw where-fragments below
      // would need quoting otherwise.
      .leftJoinAndSelect('product.order', 'ord')
      .leftJoinAndSelect('product.stage', 'stage')
      .leftJoinAndSelect('product.storageRack', 'storageRack')
      .leftJoinAndSelect('storageRack.storage', 'storage')
      .leftJoinAndSelect('storage.location', 'storageLocation')
      .leftJoinAndSelect('product.producedByUser', 'producedByUser')
      .leftJoinAndSelect('product.inputReceivedByUser', 'inputReceivedByUser');

    if (options.memberProjectIds) {
      if (options.memberProjectIds.length === 0) {
        qb.andWhere('product.order_id IS NULL');
      } else {
        qb.andWhere(
          '(product.order_id IS NULL OR ord.project_id IN (:...projectIds))',
          { projectIds: options.memberProjectIds },
        );
      }
    }

    if (options.q) {
      qb.andWhere('(product.code ILIKE :q OR product.name ILIKE :q)', {
        q: `%${options.q}%`,
      });
    }
    if (options.orderId) {
      qb.andWhere('product.order_id = :orderId', { orderId: options.orderId });
    }
    if (options.processId) {
      qb.andWhere('product.process_id = :processId', {
        processId: options.processId,
      });
    }
    if (options.stageId) {
      qb.andWhere('product.stage_id = :stageId', { stageId: options.stageId });
    }
    if (options.productTypeId) {
      qb.andWhere('product.product_type_id = :productTypeId', {
        productTypeId: options.productTypeId,
      });
    }
    if (options.storageId) {
      qb.andWhere('storageRack.storage_id = :storageId', {
        storageId: options.storageId,
      });
    }
    if (options.storageRackId) {
      qb.andWhere('product.storage_rack_id = :storageRackId', {
        storageRackId: options.storageRackId,
      });
    }
    if (options.consumedByStageId) {
      qb.andWhere('product.consumed_by_stage_id = :consumedByStageId', {
        consumedByStageId: options.consumedByStageId,
      });
    }
    if (options.consumedByProcessId) {
      qb.innerJoin('product.consumedByStage', 'consumedByStage').andWhere(
        'consumedByStage.process_id = :consumedByProcessId',
        { consumedByProcessId: options.consumedByProcessId },
      );
    }
    if (options.unconsumed === 'true') {
      qb.andWhere('product.consumed_by_stage_id IS NULL');
    }

    qb.orderBy(`product.${options.sort as string}`, options.order)
      .skip(options.skip)
      .take(options.take);

    return qb.getManyAndCount();
  }

  /** Load one product with its origin relations (eagers load automatically). */
  findById(id: string): Promise<Product | null> {
    return this.repo.findOne({
      where: { id },
      relations: {
        order: true,
        process: true,
        // NOTE: keep one-to-many relations OUT of this tree — nesting (e.g.
        // stage.workers) combines with the joined stages' own eager
        // one-to-manys into a single row-exploding query (measured ~10s per
        // findOne). The storageRack chain below is ManyToOne-only — safe.
        stage: true,
        consumedByStage: true,
        storageRack: { storage: { location: true } },
      },
    });
  }

  /** All codes starting with `prefix` (incl. soft-deleted, for sequencing). */
  async findCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { code: Like(`${prefix}%`) },
      withDeleted: true,
      select: { code: true },
      loadEagerRelations: false,
    });
    return rows.map((r) => r.code);
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(product: Product): Promise<Product> {
    return this.repo.softRemove(product);
  }
}

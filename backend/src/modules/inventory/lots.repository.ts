import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Like, Repository } from 'typeorm';
import { Lot } from './entities/lot.entity';
import { LotStatus } from './enums/lot-status.enum';

@Injectable()
export class LotsRepository {
  constructor(
    @InjectRepository(Lot)
    private readonly repo: Repository<Lot>,
  ) {}

  create(data: Partial<Lot>): Lot {
    return this.repo.create(data);
  }

  save(lot: Lot): Promise<Lot> {
    return this.repo.save(lot);
  }

  /**
   * Highest trailing sequence among lot numbers starting with `prefix` (e.g.
   * `LOT-20260705-`). Counts soft-deleted rows too so the sequence never reuses
   * a retired number. Returns 0 when none exist.
   */
  async maxSequenceForPrefix(prefix: string): Promise<number> {
    const rows = await this.repo.find({
      where: { lotNumber: Like(`${prefix}%`) },
      withDeleted: true,
      select: { id: true, lotNumber: true },
    });
    let max = 0;
    for (const r of rows) {
      const n = Number.parseInt(r.lotNumber.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
    return max;
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Lot;
    order: 'ASC' | 'DESC';
    q?: string;
    materialId?: string;
    projectId?: string;
    status?: LotStatus;
    // Warehouse-responsible scoping via rack -> zone -> warehouse. An empty
    // array matches nothing; lots with no rack are excluded (no warehouse).
    warehouseIds?: string[];
  }): Promise<[Lot[], number]> {
    const where: FindOptionsWhere<Lot> = {};
    if (options.materialId) where.materialId = options.materialId;
    if (options.projectId) where.projectId = options.projectId;
    if (options.status) where.status = options.status;
    if (options.q) where.lotNumber = ILike(`%${options.q}%`);
    if (options.warehouseIds !== undefined) {
      where.rack = { zone: { warehouseId: In(options.warehouseIds) } };
    }

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Lot | null> {
    return this.repo.findOne({ where: { id } });
  }

  // Excludes soft-deleted rows (default), so a deleted lot number is reusable.
  findByMaterialAndLotNumber(
    materialId: string,
    lotNumber: string,
  ): Promise<Lot | null> {
    return this.repo.findOne({ where: { materialId, lotNumber } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(lot: Lot): Promise<Lot> {
    return this.repo.softRemove(lot);
  }
}

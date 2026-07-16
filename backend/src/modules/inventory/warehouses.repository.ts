import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';

@Injectable()
export class WarehousesRepository {
  constructor(
    @InjectRepository(Warehouse)
    private readonly repo: Repository<Warehouse>,
  ) {}

  create(data: Partial<Warehouse>): Warehouse {
    return this.repo.create(data);
  }

  save(warehouse: Warehouse): Promise<Warehouse> {
    return this.repo.save(warehouse);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Warehouse;
    order: 'ASC' | 'DESC';
    q?: string;
  }): Promise<[Warehouse[], number]> {
    const where: FindOptionsWhere<Warehouse>[] | undefined = options.q
      ? [{ code: ILike(`%${options.q}%`) }, { name: ILike(`%${options.q}%`) }]
      : undefined;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Warehouse | null> {
    return this.repo.findOne({ where: { id } });
  }

  // Loads the warehouse with its (non-deleted) zones so soft-remove can
  // cascade to them.
  findByIdWithZones(id: string): Promise<Warehouse | null> {
    return this.repo.findOne({ where: { id }, relations: { zones: true } });
  }

  findByCode(code: string): Promise<Warehouse | null> {
    return this.repo.findOne({ where: { code } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(warehouse: Warehouse): Promise<Warehouse> {
    return this.repo.softRemove(warehouse);
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Zone } from './entities/zone.entity';

@Injectable()
export class ZonesRepository {
  constructor(
    @InjectRepository(Zone)
    private readonly repo: Repository<Zone>,
  ) {}

  create(data: Partial<Zone>): Zone {
    return this.repo.create(data);
  }

  save(zone: Zone): Promise<Zone> {
    return this.repo.save(zone);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Zone;
    order: 'ASC' | 'DESC';
    q?: string;
    warehouseId?: string;
    projectId?: string;
  }): Promise<[Zone[], number]> {
    const base: FindOptionsWhere<Zone> = {};
    if (options.warehouseId) base.warehouseId = options.warehouseId;
    if (options.projectId) base.projectId = options.projectId;

    const where: FindOptionsWhere<Zone> | FindOptionsWhere<Zone>[] = options.q
      ? [
          { ...base, code: ILike(`%${options.q}%`) },
          { ...base, name: ILike(`%${options.q}%`) },
        ]
      : base;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Zone | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByWarehouseAndCode(
    warehouseId: string,
    code: string,
  ): Promise<Zone | null> {
    return this.repo.findOne({ where: { warehouseId, code } });
  }

  softRemove(zone: Zone): Promise<Zone> {
    return this.repo.softRemove(zone);
  }
}

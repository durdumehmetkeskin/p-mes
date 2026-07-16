import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialUnit } from './entities/material-unit.entity';

@Injectable()
export class MaterialUnitsRepository {
  constructor(
    @InjectRepository(MaterialUnit)
    private readonly repo: Repository<MaterialUnit>,
  ) {}

  create(data: Partial<MaterialUnit>): MaterialUnit {
    return this.repo.create(data);
  }

  save(unit: MaterialUnit): Promise<MaterialUnit> {
    return this.repo.save(unit);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof MaterialUnit;
    order: 'ASC' | 'DESC';
  }): Promise<[MaterialUnit[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<MaterialUnit | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<MaterialUnit | null> {
    return this.repo.findOne({ where: { name } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(unit: MaterialUnit): Promise<MaterialUnit> {
    return this.repo.softRemove(unit);
  }
}

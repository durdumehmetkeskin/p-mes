import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaterialType } from './entities/material-type.entity';

@Injectable()
export class MaterialTypesRepository {
  constructor(
    @InjectRepository(MaterialType)
    private readonly repo: Repository<MaterialType>,
  ) {}

  create(data: Partial<MaterialType>): MaterialType {
    return this.repo.create(data);
  }

  save(type: MaterialType): Promise<MaterialType> {
    return this.repo.save(type);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof MaterialType;
    order: 'ASC' | 'DESC';
  }): Promise<[MaterialType[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<MaterialType | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<MaterialType | null> {
    return this.repo.findOne({ where: { name } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(type: MaterialType): Promise<MaterialType> {
    return this.repo.softRemove(type);
  }
}

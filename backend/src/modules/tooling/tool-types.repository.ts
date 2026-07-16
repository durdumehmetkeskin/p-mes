import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ToolType } from './entities/tool-type.entity';

@Injectable()
export class ToolTypesRepository {
  constructor(
    @InjectRepository(ToolType)
    private readonly repo: Repository<ToolType>,
  ) {}

  create(data: Partial<ToolType>): ToolType {
    return this.repo.create(data);
  }

  save(type: ToolType): Promise<ToolType> {
    return this.repo.save(type);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolType;
    order: 'ASC' | 'DESC';
  }): Promise<[ToolType[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<ToolType | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<ToolType | null> {
    return this.repo.findOne({ where: { name } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(type: ToolType): Promise<ToolType> {
    return this.repo.softRemove(type);
  }
}

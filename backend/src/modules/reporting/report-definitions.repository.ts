import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportDefinition } from './entities/report-definition.entity';

@Injectable()
export class ReportDefinitionsRepository {
  constructor(
    @InjectRepository(ReportDefinition)
    private readonly repo: Repository<ReportDefinition>,
  ) {}

  create(data: Partial<ReportDefinition>): ReportDefinition {
    return this.repo.create(data);
  }

  save(definition: ReportDefinition): Promise<ReportDefinition> {
    return this.repo.save(definition);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ReportDefinition;
    order: 'ASC' | 'DESC';
  }): Promise<[ReportDefinition[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<ReportDefinition | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByKey(key: string): Promise<ReportDefinition | null> {
    return this.repo.findOne({ where: { key } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(definition: ReportDefinition): Promise<ReportDefinition> {
    return this.repo.softRemove(definition);
  }
}

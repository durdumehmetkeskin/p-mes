import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditRepository {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof AuditLog;
    order: 'ASC' | 'DESC';
    where: FindOptionsWhere<AuditLog>;
  }): Promise<[AuditLog[], number]> {
    return this.repo.findAndCount({
      where: options.where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<AuditLog | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** Distinct entity names present in the trail (drives the filter dropdown). */
  async distinctEntities(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .select('DISTINCT a.entity', 'entity')
      .orderBy('a.entity', 'ASC')
      .getRawMany<{ entity: string }>();
    return rows.map((r) => r.entity);
  }
}

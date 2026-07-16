import { Injectable, NotFoundException } from '@nestjs/common';
import { FindOptionsWhere } from 'typeorm';
import { AuditRepository } from './audit.repository';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './enums/audit-action.enum';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof AuditLog;
    order: 'ASC' | 'DESC';
    filters: { action?: AuditAction; entity?: string; actorId?: string };
  }): Promise<[AuditLog[], number]> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (options.filters.action) where.action = options.filters.action;
    if (options.filters.entity) where.entity = options.filters.entity;
    if (options.filters.actorId) where.actorId = options.filters.actorId;

    return this.auditRepository.findAndCount({
      skip: options.skip,
      take: options.take,
      sort: options.sort,
      order: options.order,
      where,
    });
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.auditRepository.findById(id);
    if (!log) {
      throw new NotFoundException(`Audit log ${id} not found`);
    }
    return log;
  }

  distinctEntities(): Promise<string[]> {
    return this.auditRepository.distinctEntities();
  }
}

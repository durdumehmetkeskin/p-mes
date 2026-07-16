import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { ToolAssignment } from './entities/tool-assignment.entity';
import { ToolAssignmentStatus } from './enums/tool-assignment-status.enum';

@Injectable()
export class ToolAssignmentsRepository {
  constructor(
    @InjectRepository(ToolAssignment)
    private readonly repo: Repository<ToolAssignment>,
  ) {}

  create(data: Partial<ToolAssignment>): ToolAssignment {
    return this.repo.create(data);
  }

  save(assignment: ToolAssignment): Promise<ToolAssignment> {
    return this.repo.save(assignment);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolAssignment;
    order: 'ASC' | 'DESC';
    toolId?: string;
    status?: ToolAssignmentStatus;
  }): Promise<[ToolAssignment[], number]> {
    const where: FindOptionsWhere<ToolAssignment> = {};
    if (options.toolId) where.toolId = options.toolId;
    if (options.status) where.status = options.status;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  /** The single ACTIVE assignment for a tool, if any. */
  findActiveByTool(toolId: string): Promise<ToolAssignment | null> {
    return this.repo.findOne({
      where: { toolId, status: ToolAssignmentStatus.Active },
    });
  }
}

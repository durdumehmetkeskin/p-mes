import { Injectable } from '@nestjs/common';
import { ToolAssignment } from './entities/tool-assignment.entity';
import { ToolAssignmentsRepository } from './tool-assignments.repository';
import { ToolAssignmentStatus } from './enums/tool-assignment-status.enum';

@Injectable()
export class ToolAssignmentsService {
  constructor(
    private readonly assignmentsRepository: ToolAssignmentsRepository,
  ) {}

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ToolAssignment;
    order: 'ASC' | 'DESC';
    toolId?: string;
    status?: ToolAssignmentStatus;
  }): Promise<[ToolAssignment[], number]> {
    return this.assignmentsRepository.findAndCount(options);
  }
}

import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ToolAssignmentStatus } from '../enums/tool-assignment-status.enum';
import { Tool } from './tool.entity';

/**
 * A checkout of a tool to an assignee (operator / work order / machine). One
 * tool can have at most one ACTIVE assignment at a time; returning it sets
 * `returnedAt` and flips the status to RETURNED. The row is kept as history.
 */
@Entity('tool_assignments')
export class ToolAssignment extends BaseEntity {
  @ManyToOne(() => Tool, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;

  @Index()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  // Free-text assignee: operator name, work order, machine, etc.
  @Column({ type: 'varchar', length: 255, name: 'assigned_to' })
  assignedTo: string;

  @Column({
    type: 'enum',
    enum: ToolAssignmentStatus,
    default: ToolAssignmentStatus.Active,
  })
  status: ToolAssignmentStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Actor who performed the assignment.
  @Column({ type: 'uuid', name: 'assigned_by_id', nullable: true })
  assignedById: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'assigned_by_email',
    nullable: true,
  })
  assignedByEmail: string | null;

  // Return details (set when the tool is checked back in).
  @Column({ type: 'timestamptz', name: 'returned_at', nullable: true })
  returnedAt: Date | null;

  @Column({ type: 'uuid', name: 'returned_by_id', nullable: true })
  returnedById: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'returned_by_email',
    nullable: true,
  })
  returnedByEmail: string | null;

  @Column({ type: 'varchar', length: 500, name: 'return_note', nullable: true })
  returnNote: string | null;
}

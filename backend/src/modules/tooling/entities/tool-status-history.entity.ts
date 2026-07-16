import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ToolStatus } from '../enums/tool-status.enum';
import { Tool } from './tool.entity';

/**
 * Append-only record of a tool status transition (who / when / from → to /
 * note). One row is written each time a tool's status changes. Immutable —
 * cannot be updated or deleted (enforced by the ImmutabilitySubscriber).
 */
@Entity('tool_status_history')
export class ToolStatusHistory extends BaseEntity {
  @ManyToOne(() => Tool, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;

  @Index()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  // Reuses the existing tools_status_enum Postgres type.
  @Column({
    type: 'enum',
    enum: ToolStatus,
    enumName: 'tools_status_enum',
    name: 'from_status',
    nullable: true,
  })
  fromStatus: ToolStatus | null;

  @Column({
    type: 'enum',
    enum: ToolStatus,
    enumName: 'tools_status_enum',
    name: 'to_status',
  })
  toStatus: ToolStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Snapshot of the actor (so the timeline renders without a user join).
  @Column({ type: 'uuid', name: 'changed_by_id', nullable: true })
  changedById: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'changed_by_email',
    nullable: true,
  })
  changedByEmail: string | null;
}

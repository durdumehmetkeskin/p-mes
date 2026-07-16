import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { ToolUsageStatus } from '../enums/tool-usage-status.enum';
import { Tool } from './tool.entity';

/**
 * A usage session of a tool: when it was put to work, for how long, and how
 * much output (cycles/units). A tool can have at most one ONGOING session;
 * ending it stamps `endedAt` and computes `durationMinutes`. Rows are kept as
 * the tool's usage history (for utilisation/wear tracking).
 */
@Entity('tool_usages')
export class ToolUsage extends BaseEntity {
  @ManyToOne(() => Tool, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;

  @Index()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  // What the tool was used for: work order / operation / machine.
  @Column({ type: 'varchar', length: 255, name: 'used_for', nullable: true })
  usedFor: string | null;

  @Column({
    type: 'enum',
    enum: ToolUsageStatus,
    default: ToolUsageStatus.Ongoing,
  })
  status: ToolUsageStatus;

  @Column({ type: 'timestamptz', name: 'started_at' })
  startedAt: Date;

  @Column({ type: 'timestamptz', name: 'ended_at', nullable: true })
  endedAt: Date | null;

  // Elapsed minutes (computed when the session ends).
  @Column({ type: 'int', name: 'duration_minutes', nullable: true })
  durationMinutes: number | null;

  // Output during the session: cycles / units produced.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  quantity: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Actor who recorded the session.
  @Column({ type: 'uuid', name: 'recorded_by_id', nullable: true })
  recordedById: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'recorded_by_email',
    nullable: true,
  })
  recordedByEmail: string | null;
}

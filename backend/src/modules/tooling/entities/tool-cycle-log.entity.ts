import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tool } from './tool.entity';

/**
 * Append-only log of cycle-counter changes for a tool: each production end
 * (usage), manual addition, or reset writes one row capturing the delta and the
 * resulting currentLifeCycle. Immutable (enforced by ImmutabilitySubscriber).
 */
@Entity('tool_cycle_logs')
export class ToolCycleLog extends BaseEntity {
  @ManyToOne(() => Tool, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;

  @Index()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  // Signed delta applied to the counter (positive for increments, negative on
  // reset).
  @Column({ type: 'int' })
  cycles: number;

  // The counter value after this change.
  @Column({ type: 'int', name: 'resulting_life_cycle' })
  resultingLifeCycle: number;

  // Where the change came from: 'usage' | 'manual' | 'reset'.
  @Column({ type: 'varchar', length: 50 })
  source: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

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

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { ProcessStatus } from '../enums/process-status.enum';
import { OrderItem } from './order-item.entity';
import { ProcessStage } from './process-stage.entity';
import { WorkflowTemplate } from './workflow-template.entity';

/**
 * A runtime workflow instance for an order item — copied from a template but
 * living independently afterwards (template changes never affect it).
 */
@Entity('processes')
export class Process extends BaseEntity {
  @ManyToOne(() => OrderItem, (orderItem) => orderItem.processes, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_item_id' })
  orderItem: OrderItem;

  @Index()
  @Column({ type: 'uuid', name: 'order_item_id' })
  orderItemId: string;

  // The template this process was generated from (informational only; SET NULL
  // so deleting the template never affects the process). Independence is
  // guaranteed because stages are copied, not referenced.
  @ManyToOne(() => WorkflowTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'used_template_id' })
  usedTemplate: WorkflowTemplate | null;

  @Index()
  @Column({ type: 'uuid', name: 'used_template_id', nullable: true })
  usedTemplateId: string | null;

  // Responsible user — assigned from the project team.
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'responsible_user_id', nullable: true })
  responsibleUserId: string | null;

  @Column({
    type: 'enum',
    enum: ProcessStatus,
    enumName: 'process_status_enum',
    name: 'overall_status',
    default: ProcessStatus.Draft,
  })
  overallStatus: ProcessStatus;

  // Set when the first stage starts; cleared if the process returns to draft.
  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt: Date | null;

  // Set when all stages are completed; cleared if the process is reopened.
  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  // Sum of the stages' manually entered durations (hours).
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'duration_hours',
    default: 0,
    transformer: numericTransformer,
  })
  durationHours: number;

  // When true, estimated start/completed dates and duration are mandatory for
  // this process and every stage added to it.
  @Column({ type: 'boolean', name: 'require_estimates', default: false })
  requireEstimates: boolean;

  @Column({ type: 'date', name: 'estimated_start_date', nullable: true })
  estimatedStartDate: string | null;

  @Column({ type: 'date', name: 'estimated_completed_date', nullable: true })
  estimatedCompletedDate: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'estimated_duration_hours',
    nullable: true,
    transformer: numericTransformer,
  })
  estimatedDurationHours: number | null;

  // Deleting a process cascades to its stages (when loaded).
  @OneToMany(() => ProcessStage, (stage) => stage.process, {
    cascade: ['soft-remove'],
  })
  stages: ProcessStage[];
}

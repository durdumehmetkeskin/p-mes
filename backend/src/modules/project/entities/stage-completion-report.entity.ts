import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { ProcessStage } from './process-stage.entity';

/**
 * The completion report filed for a process stage once it is completed. One per
 * stage (1:1). `createdAt`/`updatedAt` serve as the report date.
 */
@Entity('stage_completion_reports')
export class StageCompletionReport extends BaseEntity {
  @OneToOne(() => ProcessStage, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage: ProcessStage;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'stage_id' })
  stageId: string;

  // What was done / completion notes.
  @Column({ type: 'text' })
  summary: string;

  // Result note (e.g. "OK", "rework").
  @Column({ type: 'varchar', length: 100, nullable: true })
  outcome: string | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reported_by_user_id' })
  reportedByUser: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'reported_by_user_id', nullable: true })
  reportedByUserId: string | null;
}

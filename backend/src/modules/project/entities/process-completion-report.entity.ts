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
import { Process } from './process.entity';

/**
 * The completion report filed for a process once it is completed. One per
 * process (1:1). `createdAt`/`updatedAt` serve as the report date.
 */
@Entity('process_completion_reports')
export class ProcessCompletionReport extends BaseEntity {
  @OneToOne(() => Process, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'process_id' })
  process: Process;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'process_id' })
  processId: string;

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

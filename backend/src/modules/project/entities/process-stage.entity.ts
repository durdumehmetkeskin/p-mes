import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { ProcessStageStatus } from '../enums/process-stage-status.enum';
import { ProcessStageLink } from './process-stage-link.entity';
import { Process } from './process.entity';
import { StageType } from './stage-type.entity';

/**
 * A stage of a runtime process. Copied from a workflow template stage at clone
 * time and then independent: its sequence/name/input/output are stored locally,
 * so editing the template (or this stage) never affects the other.
 */
@Entity('process_stages')
export class ProcessStage extends BaseEntity {
  @ManyToOne(() => Process, (process) => process.stages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'process_id' })
  process: Process;

  @Index()
  @Column({ type: 'uuid', name: 'process_id' })
  processId: string;

  // Catalog type. Nullable + SET NULL so catalog changes do not break
  // existing process stages.
  @ManyToOne(() => StageType, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'stage_type_id' })
  stageType: StageType | null;

  @Index()
  @Column({ type: 'uuid', name: 'stage_type_id', nullable: true })
  stageTypeId: string | null;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  input: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  output: string | null;

  @Column({
    type: 'enum',
    enum: ProcessStageStatus,
    enumName: 'process_stage_status_enum',
    default: ProcessStageStatus.Pending,
  })
  status: ProcessStageStatus;

  // Workers assigned to this stage (a stage has ONLY workers — the old
  // per-stage responsible was removed; managerial ownership lives on the
  // process). Workers see the stage on their board and count into
  // workload/personnel views.
  @ManyToMany(() => User, { eager: true })
  @JoinTable({
    name: 'process_stage_workers',
    joinColumn: { name: 'stage_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  workers: User[];

  @Column({ type: 'timestamptz', name: 'started_at', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  // Manually entered duration in hours; summed into the process duration.
  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'duration_hours',
    nullable: true,
    transformer: numericTransformer,
  })
  durationHours: number | null;

  // Planning estimates (mandatory when the process requires estimates).
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

  @Column({ type: 'varchar', length: 1000, nullable: true })
  note: string | null;

  // Work directives/instructions for the stage. Writable ONLY by the stage's
  // responsible user or an admin (service-enforced); project members read.
  @Column({ type: 'text', nullable: true })
  directives: string | null;

  // Canvas position on the process DAG view (null = auto-layout). Seeded from
  // the template stage at clone time; updated by drag & drop.
  @Column({ type: 'double precision', name: 'pos_x', nullable: true })
  posX: number | null;

  @Column({ type: 'double precision', name: 'pos_y', nullable: true })
  posY: number | null;

  // Dependency edges INTO this stage (DAG gating: every fromStage must be
  // completed before this stage can start; no incoming links = startable
  // root). Eager so all stage payloads ship the graph; the link's ManyToOnes
  // are not eager (no recursion). `sequence` above remains only a derived
  // topological DISPLAY order.
  @OneToMany(() => ProcessStageLink, (link) => link.toStage, { eager: true })
  incomingLinks: ProcessStageLink[];
}

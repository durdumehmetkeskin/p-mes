import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tool } from '../../tooling/entities/tool.entity';
import { User } from '../../users/entities/user.entity';
import { ToolReservationStatus } from '../enums/tool-reservation-status.enum';
import { ProcessStage } from './process-stage.entity';

/**
 * A tool reserved for a process stage, with a material-style QR handover:
 * reserved → (crib scans) delivering → (stage responsible scans) received →
 * (stage, after completion) returning → (crib scans) returned. Delivering the
 * tool requires it to be `available` and flips it to `in_use`; receive-return
 * flips it back. The stage can't start until every reservation is `received`.
 */
@Entity('stage_tool_reservations')
// NOT unique: a stage may hold SEVERAL disjoint time ranges of the same tool
// (e.g. 09:00–12:00 on three consecutive days) — one row per range.
@Index(['stageId', 'toolId'])
export class StageToolReservation extends BaseEntity {
  @ManyToOne(() => ProcessStage, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage: ProcessStage;

  @Index()
  @Column({ type: 'uuid', name: 'stage_id' })
  stageId: string;

  @ManyToOne(() => Tool, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tool_id' })
  tool: Tool;

  @Index()
  @Column({ type: 'uuid', name: 'tool_id' })
  toolId: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Reserved datetime range (wall-clock on the UTC face — "floating time";
  // display via iso.slice, never toLocaleString). Must lie within the stage's
  // date window. NULL on legacy rows → the stage window applies at check time.
  @Column({ type: 'timestamptz', name: 'reserved_from', nullable: true })
  reservedFrom: Date | null;

  @Column({ type: 'timestamptz', name: 'reserved_to', nullable: true })
  reservedTo: Date | null;

  @Column({
    type: 'enum',
    enum: ToolReservationStatus,
    default: ToolReservationStatus.Reserved,
  })
  status: ToolReservationStatus;

  // Crib → stage handover: who delivered the tool out of the crib and when.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivered_by_user_id' })
  deliveredByUser: User | null;

  @Column({ type: 'uuid', name: 'delivered_by_user_id', nullable: true })
  deliveredByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  // The stage responsible takes delivery (gates the stage start).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'received_by_user_id' })
  receivedByUser: User | null;

  @Column({ type: 'uuid', name: 'received_by_user_id', nullable: true })
  receivedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'received_at', nullable: true })
  receivedAt: Date | null;

  // Stage → crib return (after the stage completes).
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'returned_by_user_id' })
  returnedByUser: User | null;

  @Column({ type: 'uuid', name: 'returned_by_user_id', nullable: true })
  returnedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'returned_at', nullable: true })
  returnedAt: Date | null;
}

import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../project/entities/order.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { Section } from './section.entity';

/**
 * Reserves a section for a single order over a date range. Overlapping
 * reservations on the same section are rejected by the service.
 */
@Entity('section_reservations')
export class SectionReservation extends BaseEntity {
  @ManyToOne(() => Section, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: Section;

  @Index()
  @Column({ type: 'uuid', name: 'section_id' })
  sectionId: string;

  @ManyToOne(() => Order, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  // Optional stage this reservation was planned for (set when reserving from
  // the stage dialog) — lets the stage UI find and prefill its reservation.
  @ManyToOne(() => ProcessStage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stage_id' })
  stage: ProcessStage | null;

  @Index()
  @Column({ type: 'uuid', name: 'stage_id', nullable: true })
  stageId: string | null;

  @Column({ type: 'date', name: 'start_date' })
  startDate: string;

  @Column({ type: 'date', name: 'end_date' })
  endDate: string;

  // Hour-granular range ("floating time" on the UTC face — display via
  // iso.slice, never toLocaleString). Source of truth for overlap checks;
  // the date columns above are kept in sync for display/Gantt consumers.
  @Column({ type: 'timestamptz', name: 'start_at', nullable: true })
  startAt: Date | null;

  @Column({ type: 'timestamptz', name: 'end_at', nullable: true })
  endAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;
}

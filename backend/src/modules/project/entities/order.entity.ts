import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { Project } from './project.entity';

/** An order (SiparişEmri) belonging to a project. */
@Entity('orders')
export class Order extends BaseEntity {
  @ManyToOne(() => Project, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, name: 'order_number' })
  orderNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'date', name: 'due_date', nullable: true })
  dueDate: string | null;

  // Derived from the order's processes (see OrdersService.recomputeStatus);
  // never client-set.
  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
    default: OrderStatus.Pending,
  })
  status: OrderStatus;
}

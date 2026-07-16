import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { Order } from './order.entity';
import { Process } from './process.entity';

/**
 * A line item of an order. An order is broken into items, and the runtime
 * production processes live inside each item (Order → OrderItem → Process).
 */
@Entity('order_items')
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  // Line number within the order.
  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  // Derived from the item's own processes (see
  // OrdersService.recomputeItemStatus); never client-set. Same lifecycle as
  // the order one level up: pending → in_progress (any process past draft) →
  // completed (all processes completed).
  @Column({
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status_enum',
    default: OrderStatus.Pending,
  })
  status: OrderStatus;

  // Deleting an item cascades (soft-remove) to its processes (when loaded).
  @OneToMany(() => Process, (process) => process.orderItem, {
    cascade: ['soft-remove'],
  })
  processes: Process[];
}

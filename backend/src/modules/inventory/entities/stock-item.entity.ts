import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Order } from '../../project/entities/order.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { User } from '../../users/entities/user.entity';
import { StockItemStatus } from '../enums/stock-item-status.enum';
import { Lot } from './lot.entity';
import { Rack } from './rack.entity';
import { Warehouse } from './warehouse.entity';

/**
 * A unit of stock under a lot at a physical location (warehouse/rack). This is
 * the single source of truth for on-hand stock (there is no separate balances
 * table). An `available` item is free stock; reserving splits off a `reserved`
 * item carrying the order (+ optional stage); issuing marks it `consumed`.
 *
 * Invariant: at most one `available` item exists per (lot, warehouse, rack)
 * slot — the free pool that receive credits and reserve/issue debit. Reserved
 * items are one per reservation.
 */
@Entity('stock_items')
export class StockItem extends BaseEntity {
  // Parent lot — material, customer and project are reached through it.
  @ManyToOne(() => Lot, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lot_id' })
  lot: Lot;

  @Index()
  @Column({ type: 'uuid', name: 'lot_id' })
  lotId: string;

  @ManyToOne(() => Warehouse, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Index()
  @Column({ type: 'uuid', name: 'warehouse_id' })
  warehouseId: string;

  @ManyToOne(() => Rack, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rack_id' })
  rack: Rack | null;

  @Index()
  @Column({ type: 'uuid', name: 'rack_id', nullable: true })
  rackId: string | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    transformer: numericTransformer,
  })
  quantity: number;

  @Index()
  @Column({
    type: 'enum',
    enum: StockItemStatus,
    default: StockItemStatus.Available,
  })
  status: StockItemStatus;

  // Order this item is reserved for (only set when status = reserved). The order
  // must belong to the lot's project. SET NULL on order delete.
  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Index()
  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  // Optional process stage the reserved stock will be used in.
  @ManyToOne(() => ProcessStage, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'stage_id' })
  stage: ProcessStage | null;

  @Index()
  @Column({ type: 'uuid', name: 'stage_id', nullable: true })
  stageId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Warehouse→stage handover audit: who delivered/received and when.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivered_by_user_id' })
  deliveredByUser: User | null;

  @Column({ type: 'uuid', name: 'delivered_by_user_id', nullable: true })
  deliveredByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'received_by_user_id' })
  receivedByUser: User | null;

  @Column({ type: 'uuid', name: 'received_by_user_id', nullable: true })
  receivedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'received_at', nullable: true })
  receivedAt: Date | null;

  // Stage→warehouse return: who handed the leftover back (stage side) and when.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'returned_by_user_id' })
  returnedByUser: User | null;

  @Column({ type: 'uuid', name: 'returned_by_user_id', nullable: true })
  returnedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'returned_at', nullable: true })
  returnedAt: Date | null;
}

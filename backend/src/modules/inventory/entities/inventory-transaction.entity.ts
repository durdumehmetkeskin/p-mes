import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum';
import { User } from '../../users/entities/user.entity';
import { Rack } from './rack.entity';
import { Lot } from './lot.entity';
import { Material } from './material.entity';
import { Warehouse } from './warehouse.entity';

/**
 * An immutable stock movement record. Creating one atomically adjusts the
 * affected inventory balance(s): IN credits the target, OUT debits the source,
 * TRANSFER debits the source and credits the target.
 */
@Entity('inventory_transactions')
@Index('IDX_inv_tx_created_at', ['createdAt'])
export class InventoryTransaction extends BaseEntity {
  @Column({ type: 'enum', enum: InventoryTransactionType })
  type: InventoryTransactionType;

  @ManyToOne(() => Material, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Index()
  @Column({ type: 'uuid', name: 'material_id' })
  materialId: string;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  // Source slot (OUT / TRANSFER).
  @ManyToOne(() => Warehouse, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'source_warehouse_id' })
  sourceWarehouse: Warehouse | null;

  @Index('IDX_inv_tx_source_warehouse_id')
  @Column({ type: 'uuid', name: 'source_warehouse_id', nullable: true })
  sourceWarehouseId: string | null;

  @ManyToOne(() => Rack, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_rack_id' })
  sourceRack: Rack | null;

  @Column({ type: 'uuid', name: 'source_rack_id', nullable: true })
  sourceRackId: string | null;

  @ManyToOne(() => Lot, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'source_lot_id' })
  sourceLot: Lot | null;

  @Column({ type: 'uuid', name: 'source_lot_id', nullable: true })
  sourceLotId: string | null;

  // Target slot (IN / TRANSFER).
  @ManyToOne(() => Warehouse, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'target_warehouse_id' })
  targetWarehouse: Warehouse | null;

  @Index('IDX_inv_tx_target_warehouse_id')
  @Column({ type: 'uuid', name: 'target_warehouse_id', nullable: true })
  targetWarehouseId: string | null;

  @ManyToOne(() => Rack, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_rack_id' })
  targetRack: Rack | null;

  @Column({ type: 'uuid', name: 'target_rack_id', nullable: true })
  targetRackId: string | null;

  @ManyToOne(() => Lot, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'target_lot_id' })
  targetLot: Lot | null;

  @Column({ type: 'uuid', name: 'target_lot_id', nullable: true })
  targetLotId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  // Links the two legs (TRANSFER_OUT + TRANSFER_IN) of a single transfer.
  @Index()
  @Column({ type: 'uuid', name: 'transfer_group_id', nullable: true })
  transferGroupId: string | null;

  // HANDOVER audit: who delivered/received the reserved stock and when.
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

  // Attribution: the order/stage this movement was spent on (set on
  // handover/return/consume of stage-bound stock) so usage can be summed per
  // stage even after the item leaves it. FK columns only (no eager relation).
  @Index()
  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  @Index()
  @Column({ type: 'uuid', name: 'stage_id', nullable: true })
  stageId: string | null;
}

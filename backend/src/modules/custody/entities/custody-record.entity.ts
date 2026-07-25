import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { User } from '../../users/entities/user.entity';
import { CustodyCloseAction } from '../enums/custody-close-action.enum';
import { CustodyItemType } from '../enums/custody-item-type.enum';

/**
 * Per-user custody ("zimmet") ledger — ONE row per custody lifecycle: opened
 * the moment a user receives a stock item / tool / input product, closed once
 * when it is returned, consumed or released. Display fields are SNAPSHOTS so
 * the history survives deletion of the source rows (stage deletes cascade
 * tool reservations; returned stock items get merged/soft-removed).
 * Deletion is blocked by the immutability subscriber; updates stay allowed
 * because closing a record IS an update.
 */
@Entity('custody_records')
@Index(['userId', 'closedAt'])
@Index(['itemType', 'sourceId'])
export class CustodyRecord extends BaseEntity {
  @Index()
  @Column({ type: 'enum', enum: CustodyItemType, name: 'item_type' })
  itemType: CustodyItemType;

  // Id of the source row (stock item / tool reservation / product). Plain
  // column, NO FK — the record must outlive the source.
  @Index()
  @Column({ type: 'uuid', name: 'source_id' })
  sourceId: string;

  // The user holding custody. SET NULL only fires on a rare hard delete of
  // the account (users are soft-deleted); the row itself is always kept.
  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId: string | null;

  // Stage context (no FK — stages hard-delete).
  @Index()
  @Column({ type: 'uuid', name: 'stage_id', nullable: true })
  stageId: string | null;

  // ---- snapshot display fields ----
  @Column({ type: 'varchar', length: 100, name: 'item_code' })
  itemCode: string;

  @Column({ type: 'varchar', length: 255, name: 'item_name' })
  itemName: string;

  @Column({ type: 'varchar', length: 100, name: 'lot_number', nullable: true })
  lotNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  quantity: number | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'order_number',
    nullable: true,
  })
  orderNumber: string | null;

  @Column({ type: 'varchar', length: 255, name: 'stage_name', nullable: true })
  stageName: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'warehouse_code',
    nullable: true,
  })
  warehouseCode: string | null;

  // ---- lifecycle ----
  @Column({ type: 'timestamptz', name: 'received_at' })
  receivedAt: Date;

  // Set when the holder started the return ("iade yolda").
  @Column({ type: 'timestamptz', name: 'returning_at', nullable: true })
  returningAt: Date | null;

  // null = still held (open record).
  @Column({ type: 'timestamptz', name: 'closed_at', nullable: true })
  closedAt: Date | null;

  @Column({
    type: 'enum',
    enum: CustodyCloseAction,
    name: 'close_action',
    nullable: true,
  })
  closeAction: CustodyCloseAction | null;

  // Weighed leftover on a stock-item return.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    name: 'returned_quantity',
    nullable: true,
    transformer: numericTransformer,
  })
  returnedQuantity: number | null;

  // delivered − returned on return, full quantity on consume.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    name: 'used_quantity',
    nullable: true,
    transformer: numericTransformer,
  })
  usedQuantity: number | null;
}

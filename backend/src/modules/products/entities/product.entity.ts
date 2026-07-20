import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { MaterialUnit } from '../../inventory/entities/material-unit.entity';
import { StorageRack } from '../../location/entities/storage-rack.entity';
import { Order } from '../../project/entities/order.entity';
import { Process } from '../../project/entities/process.entity';
import { ProcessStage } from '../../project/entities/process-stage.entity';
import { User } from '../../users/entities/user.entity';
import { ProductHandoverStatus } from '../enums/product-handover-status.enum';
import { ProductType } from './product-type.entity';

/**
 * A concrete production-output record: something produced by manufacturing
 * (an intermediate product, a finished product, a mold, ...). NOT stock —
 * products never enter the Material/Lot/StockItem flow; the warehouse/rack
 * fields are informational only. All origin links (order/process/stage) are
 * SET NULL so a product record (a physical fact) survives deletion of the
 * production paperwork it came from.
 */
@Entity('products')
export class Product extends BaseEntity {
  // Business code — server-generated `PRD-YYYY-NNNN`, immutable.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  // Dynamic classification (intermediate / finished / mold / ...).
  @ManyToOne(() => ProductType, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'product_type_id' })
  productType: ProductType | null;

  @Index()
  @Column({ type: 'uuid', name: 'product_type_id', nullable: true })
  productTypeId: string | null;

  // Produced amount.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    transformer: numericTransformer,
  })
  quantity: number;

  // Unit of measure — reuses the shared unit lookup from inventory.
  @ManyToOne(() => MaterialUnit, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'material_unit_id' })
  materialUnit: MaterialUnit | null;

  @Index()
  @Column({ type: 'uuid', name: 'material_unit_id', nullable: true })
  materialUnitId: string | null;

  // Origin links. processId/orderId are derived server-side from the stage
  // when a stage is given (never trusted from the client together).
  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Index()
  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Process, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'process_id' })
  process: Process | null;

  @Index()
  @Column({ type: 'uuid', name: 'process_id', nullable: true })
  processId: string | null;

  @ManyToOne(() => ProcessStage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'stage_id' })
  stage: ProcessStage | null;

  @Index()
  @Column({ type: 'uuid', name: 'stage_id', nullable: true })
  stageId: string | null;

  // Stage that USED this product as an input (stage/stageId above is the stage
  // that PRODUCED it). A product is consumed by at most one stage; stages take
  // products, documents (stage_input attachments), or both.
  @ManyToOne(() => ProcessStage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'consumed_by_stage_id' })
  consumedByStage: ProcessStage | null;

  @Index()
  @Column({ type: 'uuid', name: 'consumed_by_stage_id', nullable: true })
  consumedByStageId: string | null;

  // Where the product is shelved: a rack of a LOCATION's storage area (see
  // location/entities/storage-rack.entity.ts) — informational, no stock
  // integration. The eager StorageRack→storage→location chain is
  // ManyToOne-only, so labels load without join fan-out.
  @ManyToOne(() => StorageRack, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'storage_rack_id' })
  storageRack: StorageRack | null;

  @Index()
  @Column({ type: 'uuid', name: 'storage_rack_id', nullable: true })
  storageRackId: string | null;

  @Column({ type: 'timestamptz', name: 'produced_at', nullable: true })
  producedAt: Date | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'produced_by_user_id' })
  producedByUser: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'produced_by_user_id', nullable: true })
  producedByUserId: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  note: string | null;

  // Material-style handover into storage: produced → delivering → received.
  @Column({
    type: 'enum',
    enum: ProductHandoverStatus,
    enumName: 'product_handover_status_enum',
    name: 'handover_status',
    default: ProductHandoverStatus.Produced,
  })
  handoverStatus: ProductHandoverStatus;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivered_by_user_id' })
  deliveredByUser: User | null;

  @Column({ type: 'uuid', name: 'delivered_by_user_id', nullable: true })
  deliveredByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'delivered_at', nullable: true })
  deliveredAt: Date | null;

  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'received_by_user_id' })
  receivedByUser: User | null;

  @Column({ type: 'uuid', name: 'received_by_user_id', nullable: true })
  receivedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'received_at', nullable: true })
  receivedAt: Date | null;

  // INPUT custody: when the product is consumed by a stage, a worker of THAT
  // stage picks it up (QR scan) — separate from the storage drop-off fields
  // above, which a consumed product may already carry.
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'input_received_by_user_id' })
  inputReceivedByUser: User | null;

  @Column({ type: 'uuid', name: 'input_received_by_user_id', nullable: true })
  inputReceivedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'input_received_at', nullable: true })
  inputReceivedAt: Date | null;

  // MinIO key of the product's ONE persistent QR PNG (generated once at
  // creation — every later request serves this same image).
  @Column({
    type: 'varchar',
    length: 255,
    name: 'qr_object_key',
    nullable: true,
  })
  qrObjectKey: string | null;
}

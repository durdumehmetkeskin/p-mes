import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Material } from '../../inventory/entities/material.entity';
import { Order } from './order.entity';

/**
 * A material the order requires, with the quantity the order needs. Stock is
 * reserved against this requirement (see reserveStock); shortage alerting
 * compares the uncovered remainder against the order's PROJECT stock
 * (see StockAlertService). One row per (order, material) among non-deleted rows.
 */
@Entity('order_material_requirements')
@Index('UQ_order_material_requirement', ['orderId', 'materialId'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class OrderMaterialRequirement extends BaseEntity {
  // Not eager: Order eagerly loads its Project, which would bloat every list
  // response; loaded explicitly where needed (StockAlertService).
  @ManyToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Material, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Index()
  @Column({ type: 'uuid', name: 'material_id' })
  materialId: string;

  // Quantity THIS order needs of the material (reservations count toward it).
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    name: 'required_quantity',
    transformer: numericTransformer,
  })
  requiredQuantity: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;
}

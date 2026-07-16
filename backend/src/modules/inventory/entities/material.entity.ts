import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MaterialType } from './material-type.entity';
import { MaterialUnit } from './material-unit.entity';

@Entity('materials')
export class Material extends BaseEntity {
  // Product code — unique business identifier.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50, name: 'code' })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  // Dynamic unit of measure. Nullable + SET NULL so deleting a unit does not
  // delete its materials; the create DTO still requires a unit.
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

  // Dynamic classification. Nullable so a material need not be typed, and so
  // deleting a type does not delete its materials (SET NULL).
  @ManyToOne(() => MaterialType, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'material_type_id' })
  materialType: MaterialType | null;

  @Index()
  @Column({ type: 'uuid', name: 'material_type_id', nullable: true })
  materialTypeId: string | null;

  // NOTE: materials are customer/project-agnostic by design — the customer and
  // project association lives on the LOT (and its stock), not on the material.

  // Whether stock is tracked by lot/batch number.
  @Column({ type: 'boolean', name: 'is_lot_tracked', default: false })
  isLotTracked: boolean;

  // Whether each unit is tracked by an individual serial number.
  @Column({ type: 'boolean', name: 'is_serial_tracked', default: false })
  isSerialTracked: boolean;

  // Reorder level is no longer global — it is set per order on
  // OrderMaterialRequirement (an order's required-materials list).

  // Expiry-urgency thresholds, in whole weeks before SKT. A lot of this material
  // turns "danger" (red) when its expiry is nearer than dangerWeeks, "warning"
  // (yellow) when nearer than warningWeeks, else "ok" (green). Null = no rule.
  @Column({ type: 'integer', name: 'danger_weeks', nullable: true })
  dangerWeeks: number | null;

  @Column({ type: 'integer', name: 'warning_weeks', nullable: true })
  warningWeeks: number | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

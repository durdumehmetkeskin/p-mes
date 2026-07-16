import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Project } from '../../project/entities/project.entity';
import { LotStatus } from '../enums/lot-status.enum';
import { Rack } from './rack.entity';
import { Material } from './material.entity';

/**
 * A lot/batch of a material. The lot number is unique per material (enforced
 * by a partial unique index that ignores soft-deleted rows).
 */
@Entity('lots')
@Index(['materialId', 'lotNumber'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Lot extends BaseEntity {
  @Column({ type: 'varchar', length: 50, name: 'lot_number' })
  lotNumber: string;

  // Parent material. Required; deleting the material cascades to its lots.
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

  // Optional storage rack of the lot.
  @ManyToOne(() => Rack, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rack_id' })
  rack: Rack | null;

  @Index()
  @Column({ type: 'uuid', name: 'rack_id', nullable: true })
  rackId: string | null;

  // Optional customer this lot is associated with. A project is then chosen
  // from that customer's projects. SET NULL on delete.
  @ManyToOne(() => Customer, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Index()
  @Column({ type: 'uuid', name: 'customer_id', nullable: true })
  customerId: string | null;

  // Optional project this lot is allocated to. A project can have many lots.
  // SET NULL on delete so removing a project does not delete its lots.
  @ManyToOne(() => Project, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Index()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'date', name: 'expiry_date', nullable: true })
  expiryDate: string | null;

  // Auto-managed expiry-health (see LotStatus). Never client-set — computed on
  // write and refreshed daily by LotExpiryScannerService.
  @Column({ type: 'enum', enum: LotStatus, default: LotStatus.Unknown })
  status: LotStatus;
}

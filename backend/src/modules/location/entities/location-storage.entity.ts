import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Location } from './location.entity';

/**
 * A location's storage area ("depo alanı") — a Section-like CHILD of the
 * location, completely separate from the inventory Warehouse entity (which
 * stays a standalone stock/tool concept). Exactly one live storage per
 * location; its racks live in {@link StorageRack}.
 */
@Entity('location_storages')
export class LocationStorage extends BaseEntity {
  @ManyToOne(() => Location, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

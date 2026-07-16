import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { LocationStorage } from './location-storage.entity';

/**
 * A rack inside a location's storage area — where produced products are
 * shelved. NOT an inventory Rack: the whole chain (StorageRack → storage →
 * location) is location-module-owned and ManyToOne+eager only, so product
 * labels load without join fan-out.
 */
@Entity('location_storage_racks')
@Index(['storageId', 'code'], { unique: true, where: '"deletedAt" IS NULL' })
export class StorageRack extends BaseEntity {
  @ManyToOne(() => LocationStorage, {
    eager: true,
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'storage_id' })
  storage: LocationStorage;

  @Index()
  @Column({ type: 'uuid', name: 'storage_id' })
  storageId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  note: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  // The inventory Rack this row was migrated from (SplitLocationStorage
  // migration) — kept for audit/history traceability.
  @Column({ type: 'uuid', name: 'legacy_rack_id', nullable: true })
  legacyRackId: string | null;
}

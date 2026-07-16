import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from '../../project/entities/project.entity';
import { Warehouse } from './warehouse.entity';

/**
 * A zone within a warehouse — a grouping that is subdivided into racks
 * (Warehouse → Zone → Rack). The zone code is unique per warehouse (partial
 * unique index ignoring soft-deleted rows).
 */
@Entity('zones')
@Index(['warehouseId', 'code'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Zone extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  // Parent warehouse. Required; deleting the warehouse cascades to zones.
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

  // Optional project this zone is dedicated to. A project's stock may only be
  // placed in its own zones/racks. SET NULL on project delete.
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

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

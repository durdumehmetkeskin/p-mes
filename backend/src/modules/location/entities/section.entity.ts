import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Location } from './location.entity';

/** A reservable sub-area within a location. */
@Entity('sections')
export class Section extends BaseEntity {
  @ManyToOne(() => Location, (location) => location.sections, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Index()
  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

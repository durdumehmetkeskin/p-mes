import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Location } from './location.entity';

/** An uploaded sensor-data file (.xls) whose readings were parsed into rows. */
@Entity('location_data_files')
export class LocationDataFile extends BaseEntity {
  @ManyToOne(() => Location, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Index()
  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @Column({ type: 'varchar', length: 500, name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', length: 500, name: 'object_key' })
  objectKey: string;

  @Column({ type: 'varchar', length: 255, name: 'content_type' })
  contentType: string;

  @Column({ type: 'int', default: 0 })
  size: number;

  @Column({ type: 'int', name: 'reading_count', default: 0 })
  readingCount: number;

  @Column({ type: 'timestamptz', name: 'start_time', nullable: true })
  startTime: Date | null;

  @Column({ type: 'timestamptz', name: 'end_time', nullable: true })
  endTime: Date | null;

  @Column({ type: 'uuid', name: 'uploaded_by_id', nullable: true })
  uploadedById: string | null;
}

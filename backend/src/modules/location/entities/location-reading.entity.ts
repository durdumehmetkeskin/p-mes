import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { LocationDataFile } from './location-data-file.entity';
import { Location } from './location.entity';

/** A single temperature/humidity sample for a location at a point in time. */
@Entity('location_readings')
@Index(['locationId', 'recordedAt'])
export class LocationReading extends BaseEntity {
  @ManyToOne(() => Location, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Index()
  @Column({ type: 'uuid', name: 'location_id' })
  locationId: string;

  @ManyToOne(() => LocationDataFile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'data_file_id' })
  dataFile: LocationDataFile;

  @Index()
  @Column({ type: 'uuid', name: 'data_file_id' })
  dataFileId: string;

  @Column({ type: 'timestamptz', name: 'recorded_at' })
  recordedAt: Date;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  temperature: number;

  @Column({
    type: 'numeric',
    precision: 6,
    scale: 2,
    transformer: numericTransformer,
  })
  humidity: number;
}

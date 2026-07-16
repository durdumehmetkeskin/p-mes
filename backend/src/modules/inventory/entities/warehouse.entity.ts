import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Zone } from './zone.entity';

@Entity('warehouses')
export class Warehouse extends BaseEntity {
  // Unique business code for the warehouse (e.g. WH-01).
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  // Optional responsible user for the warehouse. SET NULL on delete.
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'responsible_user_id', nullable: true })
  responsibleUserId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  // NOTE: warehouses are a pure INVENTORY concept (stock, tools, scoping).
  // A location's storage area is a separate entity — see
  // location/entities/location-storage.entity.ts.

  // Soft-removing a warehouse cascades to its zones (when loaded).
  @OneToMany(() => Zone, (zone) => zone.warehouse, {
    cascade: ['soft-remove'],
  })
  zones: Zone[];
}

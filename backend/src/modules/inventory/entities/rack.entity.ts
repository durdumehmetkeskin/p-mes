import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from '../../project/entities/order.entity';
import { Zone } from './zone.entity';

/**
 * A rack within a zone — the finest-grained storage location that holds stock
 * (Warehouse → Zone → Rack). Stock balances, lots, reservations, movements and
 * tools reference a rack. The rack code is unique per zone (partial unique
 * index ignoring soft-deleted rows).
 */
@Entity('racks')
@Index(['zoneId', 'code'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class Rack extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  // Parent zone (eager-loads its warehouse). Required; deleting the zone
  // cascades to its racks.
  @ManyToOne(() => Zone, { eager: true, nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Index()
  @Column({ type: 'uuid', name: 'zone_id' })
  zoneId: string;

  // Optional order (within the zone's project) this rack is dedicated to.
  // Reservations drawn from a dedicated rack must be for this order. SET NULL
  // on order delete.
  @ManyToOne(() => Order, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @Index()
  @Column({ type: 'uuid', name: 'order_id', nullable: true })
  orderId: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Dynamic, admin-managed classification for production outputs (e.g.
 * Intermediate Product, Finished Product, Mold). Referenced by Product via a
 * ManyToOne relation.
 */
@Entity('product_types')
export class ProductType extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Dynamic, admin-managed classification for materials (e.g. Raw Material,
 * Finished Good, Component). Referenced by Material via a ManyToOne relation.
 */
@Entity('material_types')
export class MaterialType extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

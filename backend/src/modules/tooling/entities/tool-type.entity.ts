import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Dynamic, admin-managed classification for tools (e.g. End Mill, Gauge,
 * Injection Mold). Referenced by Tool via a ManyToOne relation. Complements
 * the fixed ToolCategory enum with a finer, user-defined type.
 */
@Entity('tool_types')
export class ToolType extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

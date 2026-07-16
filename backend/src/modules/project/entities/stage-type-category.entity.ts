import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from './project.entity';

/**
 * User-managed (dynamic) categories for stage types. Seeded with "planning" and
 * "production". Scope: a null projectId means a global/system entry visible to
 * every project; a set projectId scopes it to that project only.
 */
@Entity('stage_type_categories')
export class StageTypeCategory extends BaseEntity {
  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Index()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Optional badge color (hex or token) for the UI.
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

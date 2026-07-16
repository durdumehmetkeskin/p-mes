import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from './project.entity';
import { StageTypeCategory } from './stage-type-category.entity';

/**
 * Building-block catalog of stage types (all generic — the old detailType
 * variety was removed). The category is dynamic (managed via
 * StageTypeCategory). Scope: a null projectId is a global/system entry visible
 * to every project; a set projectId scopes it to that project.
 */
@Entity('stage_types')
export class StageType extends BaseEntity {
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

  @ManyToOne(() => StageTypeCategory, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category: StageTypeCategory;

  @Index()
  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'default_input',
    nullable: true,
  })
  defaultInput: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'default_output',
    nullable: true,
  })
  defaultOutput: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

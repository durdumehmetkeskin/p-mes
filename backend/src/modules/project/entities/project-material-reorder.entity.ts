import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { numericTransformer } from '../../../common/transformers/numeric.transformer';
import { Material } from '../../inventory/entities/material.entity';
import { Project } from './project.entity';

/**
 * A per-project reorder (critical-stock) level for a material. Independent of
 * order requirements: when the project's freely-available stock of the
 * material drops to/below this level, a low-stock alert fires
 * (see StockAlertService). One row per (project, material) among non-deleted
 * rows; a level of 0 means "no rule" and the row is removed.
 */
@Entity('project_material_reorders')
@Index('UQ_project_material_reorder', ['projectId', 'materialId'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
export class ProjectMaterialReorder extends BaseEntity {
  @ManyToOne(() => Project, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Index()
  @Column({ type: 'uuid', name: 'project_id' })
  projectId: string;

  @ManyToOne(() => Material, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  @Index()
  @Column({ type: 'uuid', name: 'material_id' })
  materialId: string;

  // Reorder threshold for THIS project's freely-available stock of the material.
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
    name: 'reorder_level',
    transformer: numericTransformer,
  })
  reorderLevel: number;
}

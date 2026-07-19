import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Project } from './project.entity';
import { WorkflowTemplateStage } from './workflow-template-stage.entity';

/**
 * A reusable, data-defined workflow (ordered list of named stages). Templates
 * are blueprints; runtime processes copy them and then live independently.
 * Scope: a null projectId is a global/system template visible to every
 * project; a set projectId scopes it.
 */
@Entity('workflow_templates')
export class WorkflowTemplate extends BaseEntity {
  @ManyToOne(() => Project, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Index()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', name: 'is_system_default', default: false })
  isSystemDefault: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  // Deleting a template cascades to its stage definitions (when loaded).
  @OneToMany(() => WorkflowTemplateStage, (stage) => stage.template, {
    cascade: ['soft-remove'],
  })
  stages: WorkflowTemplateStage[];
}

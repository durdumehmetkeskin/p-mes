import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { StageType } from './stage-type.entity';
import { WorkflowTemplateStageLink } from './workflow-template-stage-link.entity';
import { WorkflowTemplate } from './workflow-template.entity';

/** One ordered stage within a workflow template. */
@Entity('workflow_template_stages')
export class WorkflowTemplateStage extends BaseEntity {
  @ManyToOne(() => WorkflowTemplate, (template) => template.stages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: WorkflowTemplate;

  @Index()
  @Column({ type: 'uuid', name: 'template_id' })
  templateId: string;

  // Referenced catalog type. RESTRICT prevents removing a type still in use.
  @ManyToOne(() => StageType, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'stage_type_id' })
  stageType: StageType;

  @Index()
  @Column({ type: 'uuid', name: 'stage_type_id' })
  stageTypeId: string;

  @Column({ type: 'int' })
  sequence: number;

  // Optional overrides of the stage type's name / default input / output.
  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  input: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  output: string | null;

  // Dependency edges INTO this stage (DAG: all fromStages must complete
  // first). Eager so every template read ships the graph without query
  // changes; the link's own ManyToOnes are not eager (no recursion).
  @OneToMany(() => WorkflowTemplateStageLink, (link) => link.toStage, {
    eager: true,
  })
  incomingLinks: WorkflowTemplateStageLink[];

  // Canvas position in the template editor (null = auto-layout).
  @Column({ type: 'double precision', name: 'pos_x', nullable: true })
  posX: number | null;

  @Column({ type: 'double precision', name: 'pos_y', nullable: true })
  posY: number | null;
}

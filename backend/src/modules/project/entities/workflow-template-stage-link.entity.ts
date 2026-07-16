import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { StageLinkKind } from '../dag.util';
import { WorkflowTemplateStage } from './workflow-template-stage.entity';

/**
 * An arrow between two stages of the same workflow template. Two kinds:
 * 'sequence' (execution order) and 'io' (`fromStage`'s OUTPUT feeds
 * `toStage`'s INPUT). BOTH gate: toStage can't start before fromStage
 * completes; stages with no path between them run in parallel. A pair may
 * carry one edge of each kind. Deleting either stage deletes the edge.
 */
@Entity('workflow_template_stage_links')
@Unique('UQ_wts_link_pair', ['fromStageId', 'toStageId', 'kind'])
export class WorkflowTemplateStageLink extends BaseEntity {
  @ManyToOne(() => WorkflowTemplateStage, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'from_stage_id' })
  fromStage: WorkflowTemplateStage;

  @Index()
  @Column({ type: 'uuid', name: 'from_stage_id' })
  fromStageId: string;

  @ManyToOne(() => WorkflowTemplateStage, (stage) => stage.incomingLinks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_stage_id' })
  toStage: WorkflowTemplateStage;

  @Index()
  @Column({ type: 'uuid', name: 'to_stage_id' })
  toStageId: string;

  @Column({ type: 'varchar', length: 20, default: 'sequence' })
  kind: StageLinkKind;
}

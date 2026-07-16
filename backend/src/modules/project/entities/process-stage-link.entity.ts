import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { StageLinkKind } from '../dag.util';
import { ProcessStage } from './process-stage.entity';

/**
 * An arrow between two stages of the same process (cloned from the template's
 * links). Two kinds: 'sequence' (execution order) and 'io' (`fromStage`'s
 * OUTPUT feeds `toStage`'s INPUT). BOTH gate: toStage can't start before
 * fromStage completes; stages with no path between them run in parallel. A
 * pair may carry one edge of each kind. Deleting either stage deletes the
 * edge (CASCADE).
 */
@Entity('process_stage_links')
@Unique('UQ_ps_link_pair', ['fromStageId', 'toStageId', 'kind'])
export class ProcessStageLink extends BaseEntity {
  @ManyToOne(() => ProcessStage, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_stage_id' })
  fromStage: ProcessStage;

  @Index()
  @Column({ type: 'uuid', name: 'from_stage_id' })
  fromStageId: string;

  @ManyToOne(() => ProcessStage, (stage) => stage.incomingLinks, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'to_stage_id' })
  toStage: ProcessStage;

  @Index()
  @Column({ type: 'uuid', name: 'to_stage_id' })
  toStageId: string;

  @Column({ type: 'varchar', length: 20, default: 'sequence' })
  kind: StageLinkKind;
}

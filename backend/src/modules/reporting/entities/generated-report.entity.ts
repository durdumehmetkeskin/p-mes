import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReportFormat } from '../enums/report-format.enum';

/**
 * History record for one rendered report. The binary lives in MinIO (object
 * storage, like attachments); this row records what was generated, with which
 * parameters, by whom. `definitionName` is denormalised so history survives the
 * definition being deleted.
 */
@Entity('generated_reports')
@Index(['definitionId'])
export class GeneratedReport extends BaseEntity {
  @Column({ type: 'uuid', name: 'definition_id' })
  definitionId: string;

  @Column({ type: 'varchar', length: 255, name: 'definition_name' })
  definitionName: string;

  @Column({
    type: 'enum',
    enum: ReportFormat,
    enumName: 'report_format_enum',
  })
  format: ReportFormat;

  // The parameters the report was rendered with (e.g. { projectId }).
  @Column({ type: 'jsonb', nullable: true })
  parameters: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 500, name: 'file_name' })
  fileName: string;

  // Key of the object in the MinIO bucket.
  @Column({ type: 'varchar', length: 500, name: 'object_key' })
  objectKey: string;

  @Column({ type: 'varchar', length: 255, name: 'content_type' })
  contentType: string;

  @Column({ type: 'int', default: 0 })
  size: number;

  @Column({ type: 'uuid', name: 'generated_by_id', nullable: true })
  generatedById: string | null;
}

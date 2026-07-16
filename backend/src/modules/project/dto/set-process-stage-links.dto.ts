import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsUUID, ValidateNested } from 'class-validator';

export class ProcessStageLinkInputDto {
  @IsUUID()
  fromStageId: string;

  @IsUUID()
  toStageId: string;

  // 'sequence' (execution order, default) or 'io' (output feeds input) — both
  // gate stage start.
  @IsOptional()
  @IsIn(['sequence', 'io'])
  kind?: 'sequence' | 'io';
}

/**
 * Replaces a process's whole stage-dependency edge set (DAG). Draft only.
 * An empty array makes every stage a parallel root.
 */
export class SetProcessStageLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessStageLinkInputDto)
  links: ProcessStageLinkInputDto[];
}

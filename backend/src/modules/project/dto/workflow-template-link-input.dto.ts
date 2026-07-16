import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

/**
 * An arrow between two stages of the SAME template payload, expressed as
 * indices into the accompanying `stages` array (template updates replace the
 * whole stage list, so ids would be meaningless here). `kind`: 'sequence'
 * (execution order, default) or 'io' (from's output feeds to's input) — both
 * gate stage start.
 */
export class WorkflowTemplateLinkInputDto {
  @IsInt()
  @Min(0)
  from: number;

  @IsInt()
  @Min(0)
  to: number;

  @IsOptional()
  @IsIn(['sequence', 'io'])
  kind?: 'sequence' | 'io';
}

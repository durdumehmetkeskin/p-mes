import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * One stage (node) inside a workflow template. Dependencies come as a separate
 * index-based `links` array on the template DTO; `sequence` is derived server
 * side as a topological display order.
 */
export class WorkflowTemplateStageInputDto {
  @IsUUID()
  stageTypeId: string;

  // Optional override of the stage type's name / default input / output.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  input?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  output?: string;

  // Canvas position in the node editor (omit for auto-layout).
  @IsOptional()
  @IsNumber()
  posX?: number;

  @IsOptional()
  @IsNumber()
  posY?: number;
}

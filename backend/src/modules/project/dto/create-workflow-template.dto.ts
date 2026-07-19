import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { WorkflowTemplateLinkInputDto } from './workflow-template-link-input.dto';
import { WorkflowTemplateStageInputDto } from './workflow-template-stage-input.dto';

export class CreateWorkflowTemplateDto {
  // Scope to a project (omit for a global/system template).
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Stage nodes. May be empty (stages can be added later).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTemplateStageInputDto)
  stages?: WorkflowTemplateStageInputDto[];

  // DAG dependency edges as indices into `stages`. Omitted with `stages`
  // present → a linear chain is synthesized (backward compatibility);
  // an empty array means "all stages are parallel roots".
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowTemplateLinkInputDto)
  links?: WorkflowTemplateLinkInputDto[];
}

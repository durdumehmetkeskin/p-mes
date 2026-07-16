import { IsOptional, IsUUID } from 'class-validator';

/** Optional project scope for the duplicated template. */
export class DuplicateWorkflowTemplateDto {
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

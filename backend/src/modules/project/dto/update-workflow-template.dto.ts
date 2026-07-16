import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkflowTemplateDto } from './create-workflow-template.dto';

/**
 * Partial update. When `stages` is provided, the template's stages are fully
 * replaced by the given ordered list; when omitted, stages are left untouched.
 */
export class UpdateWorkflowTemplateDto extends PartialType(
  CreateWorkflowTemplateDto,
) {}

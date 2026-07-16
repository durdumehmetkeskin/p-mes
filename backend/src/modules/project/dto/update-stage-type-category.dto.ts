import { PartialType } from '@nestjs/mapped-types';
import { CreateStageTypeCategoryDto } from './create-stage-type-category.dto';

export class UpdateStageTypeCategoryDto extends PartialType(
  CreateStageTypeCategoryDto,
) {}

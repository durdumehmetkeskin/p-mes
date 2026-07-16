import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateReportDefinitionDto } from './create-report-definition.dto';

/** Everything is editable except the immutable `key`. */
export class UpdateReportDefinitionDto extends PartialType(
  OmitType(CreateReportDefinitionDto, ['key'] as const),
) {}

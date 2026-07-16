import { PartialType } from '@nestjs/mapped-types';
import { CreateStageTypeDto } from './create-stage-type.dto';

export class UpdateStageTypeDto extends PartialType(CreateStageTypeDto) {}

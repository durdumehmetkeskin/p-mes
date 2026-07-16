import { PartialType } from '@nestjs/mapped-types';
import { CreateToolTypeDto } from './create-tool-type.dto';

export class UpdateToolTypeDto extends PartialType(CreateToolTypeDto) {}

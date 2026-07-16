import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialUnitDto } from './create-material-unit.dto';

export class UpdateMaterialUnitDto extends PartialType(CreateMaterialUnitDto) {}

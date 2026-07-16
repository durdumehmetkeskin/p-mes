import { PartialType } from '@nestjs/mapped-types';
import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

// All CreateUserDto fields become optional, plus an optional role assignment
// (by role name). Admin-only — see UsersController.
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  roles?: string[];
}

import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdatePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissions: string[];
}

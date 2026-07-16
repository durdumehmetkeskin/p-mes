import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z][a-z0-9_-]*$/, {
    message: 'name must be a lowercase slug (letters, digits, - and _)',
  })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_./-]*$/, {
    message: 'code must be alphanumeric (letters, digits, . / - _)',
  })
  code: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  warehouseId: string;

  // Optional project this zone is dedicated to.
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

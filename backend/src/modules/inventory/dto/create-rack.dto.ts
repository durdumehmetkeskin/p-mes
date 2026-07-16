import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateRackDto {
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
  zoneId: string;

  // Optional order (within the zone's project) this rack is dedicated to.
  @IsOptional()
  @IsUUID()
  orderId?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

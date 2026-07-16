import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateMaterialDto {
  // Server-generated (MAT-YYYY-NNNN). Optional + ignored if a client sends it.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  materialUnitId: string;

  @IsOptional()
  @IsUUID()
  materialTypeId?: string | null;

  // Deprecated: materials no longer link to a customer/project (the lot does).
  // Kept optional so older clients sending them don't 400; ignored server-side.
  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsBoolean()
  isLotTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isSerialTracked?: boolean;

  // Expiry-urgency thresholds in whole weeks (see Material entity).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dangerWeeks?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  warningWeeks?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

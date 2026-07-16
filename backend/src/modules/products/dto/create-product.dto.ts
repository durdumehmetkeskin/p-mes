import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  // Server-generated (PRD-YYYY-NNNN). Optional + ignored if a client sends it.
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

  @IsOptional()
  @IsUUID()
  productTypeId?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  quantity: number;

  @IsOptional()
  @IsUUID()
  materialUnitId?: string | null;

  // Origin links. No processId here — when stageId is given the service
  // derives processId/orderId from the stage; orderId alone is also allowed.
  @IsOptional()
  @IsUUID()
  orderId?: string | null;

  @IsOptional()
  @IsUUID()
  stageId?: string | null;

  // Shelf in a LOCATION's storage area — informational, no stock integration.
  @IsOptional()
  @IsUUID()
  storageRackId?: string | null;

  @IsOptional()
  @IsDateString()
  producedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

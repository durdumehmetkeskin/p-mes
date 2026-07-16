import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/**
 * Material issue (e.g. to production): take `quantity` of a material out of a
 * source slot. Maps to an OUT stock movement which atomically debits the
 * inventory balance after checking sufficient stock.
 */
export class IssueMaterialDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  rackId?: string;

  // Stock lives under a lot.
  @IsUUID()
  lotId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

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
 * Goods receipt: bring `quantity` of a material into a target slot. Maps to an
 * IN stock movement which atomically creates/updates the inventory balance.
 */
export class ReceiveMaterialDto {
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

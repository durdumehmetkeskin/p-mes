import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Stock count / adjustment: report the physically counted quantity for a slot.
 * If it differs from the system quantity, the balance is corrected and an
 * ADJUSTMENT movement (signed delta) is recorded.
 */
export class AdjustStockDto {
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

  // The actual counted quantity (never negative).
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  countedQuantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

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
 * Create a stock item under a lot. It is always created `available`; an order
 * or stage cannot be assigned at creation (those fields are intentionally
 * absent, so the whitelist validator rejects them — reservation is the only way
 * to attach an order/stage).
 */
export class CreateStockItemDto {
  @IsUUID()
  lotId: string;

  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsUUID()
  rackId?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

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
 * Reserve part (or all) of an available stock item for an order (and optionally
 * a stage). Splits off a new `reserved` stock item and debits the source.
 */
export class ReserveStockItemDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  // Must belong to the lot's project.
  @IsUUID()
  orderId: string;

  // Optional; must belong to the given order.
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

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
 * Edit an AVAILABLE stock item: correct its quantity, move it to another
 * warehouse/rack, or adjust the note. Items in the reservation workflow must
 * go through their verbs (reserve/release/consume/...) instead. Send
 * `rackId: null` to take the item off its rack.
 */
export class UpdateStockItemDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  rackId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

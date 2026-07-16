import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

/** Assign (part of) an order-reserved stock item to one of the order's stages. */
export class AssignStockItemStageDto {
  // Must belong to the item's order.
  @IsUUID()
  stageId: string;

  // Omitted = assign the whole item; less = split off a stage-bound part.
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity?: number;
}

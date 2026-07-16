import { Type } from 'class-transformer';
import { IsNumber, IsPositive } from 'class-validator';

/** Quantity of the requirement's material to reserve for its order. */
export class ReserveOrderMaterialRequirementDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;
}

import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Only the required quantity and note are editable; material/order are fixed. */
export class UpdateOrderMaterialRequirementDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  requiredQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}

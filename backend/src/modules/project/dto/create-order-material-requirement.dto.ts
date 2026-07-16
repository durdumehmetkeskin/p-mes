import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderMaterialRequirementDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  materialId: string;

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

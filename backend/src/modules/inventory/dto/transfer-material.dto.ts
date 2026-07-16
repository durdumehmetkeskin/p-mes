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
 * Move `quantity` of a material from a source slot to a target slot. Produces
 * a TRANSFER_OUT and a TRANSFER_IN movement and adjusts both balances in one
 * transaction.
 */
export class TransferMaterialDto {
  @IsUUID()
  materialId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @IsUUID()
  sourceWarehouseId: string;

  @IsOptional()
  @IsUUID()
  sourceRackId?: string;

  // Stock lives under a lot.
  @IsUUID()
  sourceLotId: string;

  @IsUUID()
  targetWarehouseId: string;

  @IsOptional()
  @IsUUID()
  targetRackId?: string;

  // Stock lives under a lot.
  @IsUUID()
  targetLotId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

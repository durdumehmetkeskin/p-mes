import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum';

export class CreateInventoryTransactionDto {
  @IsEnum(InventoryTransactionType)
  type: InventoryTransactionType;

  @IsUUID()
  materialId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // Source slot — required for OUT and TRANSFER.
  @IsOptional()
  @IsUUID()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  sourceRackId?: string;

  @IsOptional()
  @IsUUID()
  sourceLotId?: string;

  // Target slot — required for IN and TRANSFER.
  @IsOptional()
  @IsUUID()
  targetWarehouseId?: string;

  @IsOptional()
  @IsUUID()
  targetRackId?: string;

  @IsOptional()
  @IsUUID()
  targetLotId?: string;
}

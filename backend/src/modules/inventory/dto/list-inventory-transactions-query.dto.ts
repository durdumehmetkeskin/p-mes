import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListInventoryTransactionsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  _start?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  _end?: number;

  @IsOptional()
  @IsString()
  _sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  _order?: string;

  @IsOptional()
  @IsEnum(InventoryTransactionType)
  type?: InventoryTransactionType;

  @IsOptional()
  @IsUUID()
  materialId?: string;

  // Filter to movements touching this warehouse (source OR target leg).
  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

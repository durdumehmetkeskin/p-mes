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
import { StockItemStatus } from '../enums/stock-item-status.enum';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListStockItemsQueryDto {
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
  @IsUUID()
  lotId?: string;

  // Filter by material (via the stock item's lot).
  @IsOptional()
  @IsUUID()
  materialId?: string;

  // Filter by project (via the stock item's lot).
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  // 'true' → only items not yet assigned to any stage (the order pool).
  @IsOptional()
  @IsIn(['true'])
  stageUnassigned?: string;

  @IsOptional()
  @IsEnum(StockItemStatus)
  status?: StockItemStatus;
}

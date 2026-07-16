import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListProductsQueryDto {
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

  // Free-text filter over code/name.
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  processId?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsUUID()
  productTypeId?: string;

  // Location-storage filters (products shelved in that storage / on that rack).
  @IsOptional()
  @IsUUID()
  storageId?: string;

  @IsOptional()
  @IsUUID()
  storageRackId?: string;

  // Products used as this stage's input.
  @IsOptional()
  @IsUUID()
  consumedByStageId?: string;

  // Products consumed by ANY stage of this process (for the process canvas —
  // covers inputs produced in other processes too).
  @IsOptional()
  @IsUUID()
  consumedByProcessId?: string;

  // 'true' → only products not yet used as any stage's input.
  @IsOptional()
  @IsIn(['true', 'false'])
  unconsumed?: string;
}

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
export class ListRacksQueryDto {
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
  @IsString()
  q?: string;

  // Scope racks to a single zone.
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  // Scope racks to a single dedicated order.
  @IsOptional()
  @IsUUID()
  orderId?: string;
}

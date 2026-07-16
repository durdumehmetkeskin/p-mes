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
import { LotStatus } from '../enums/lot-status.enum';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListLotsQueryDto {
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

  // Free-text filter on lot number.
  @IsOptional()
  @IsString()
  q?: string;

  // Scope lots to a single material.
  @IsOptional()
  @IsUUID()
  materialId?: string;

  // Scope lots to a single project (lots allocated to that project).
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsEnum(LotStatus)
  status?: LotStatus;
}

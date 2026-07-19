import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/**
 * Shared pagination/sort/filter params for the project module's list endpoints
 * (Refine simple-rest protocol). Each controller uses only the filters relevant
 * to its resource.
 */
export class ListQueryDto {
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

  // Free-text search (code/name) on master data.
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsUUID()
  customerCompanyId?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  orderItemId?: string;
}

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
 * Pagination/sort/filter params for the customers module list endpoints
 * (Refine simple-rest protocol). Self-contained copy so the module does not
 * depend on the project module (mirrors how inventory/tooling keep their own
 * query DTOs).
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

  // Free-text search (code/name) on customers.
  @IsOptional()
  @IsString()
  q?: string;

  // Filter contacts by their owning customer.
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

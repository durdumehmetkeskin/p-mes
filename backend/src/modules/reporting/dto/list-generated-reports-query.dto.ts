import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

/** Pagination/sort/filter params for the generated-report history list. */
export class ListGeneratedReportsQueryDto {
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
  definitionId?: string;

  // Free-text search over file name + report name (case-insensitive).
  @IsOptional()
  @IsString()
  q?: string;
}

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
export class ListMaterialsQueryDto {
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

  // Optional free-text filter on code/name (Refine `q` param).
  @IsOptional()
  @IsString()
  q?: string;

  // Deprecated: materials are no longer project-scoped; accepted but ignored
  // so older clients don't 400 on the whitelist.
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

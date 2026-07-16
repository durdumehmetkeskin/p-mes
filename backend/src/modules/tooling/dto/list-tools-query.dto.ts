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
import { ToolCategory } from '../enums/tool-category.enum';
import { ToolStatus } from '../enums/tool-status.enum';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListToolsQueryDto {
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

  // Free-text filter on code/name.
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(ToolCategory)
  category?: ToolCategory;

  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  // Scope tools to a single storage rack.
  @IsOptional()
  @IsUUID()
  rackId?: string;

  // Filter tools to a single warehouse (via rack -> zone -> warehouse).
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  // Filter tools to a single project.
  @IsOptional()
  @IsUUID()
  projectId?: string;
}

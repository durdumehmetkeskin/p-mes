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
import { ToolAssignmentStatus } from '../enums/tool-assignment-status.enum';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListToolAssignmentsQueryDto {
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
  toolId?: string;

  @IsOptional()
  @IsEnum(ToolAssignmentStatus)
  status?: ToolAssignmentStatus;
}

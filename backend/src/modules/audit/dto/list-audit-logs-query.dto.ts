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
import { AuditAction } from '../enums/audit-action.enum';

/** Pagination/sort/filter params for the Refine simple-rest getList protocol. */
export class ListAuditLogsQueryDto {
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

  // Optional filters.
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsUUID()
  actorId?: string;
}

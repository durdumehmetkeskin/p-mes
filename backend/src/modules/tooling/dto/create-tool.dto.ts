import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ToolCategory } from '../enums/tool-category.enum';
import { ToolStatus } from '../enums/tool-status.enum';

export class CreateToolDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message: 'code must be alphanumeric (letters, digits, - and _)',
  })
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsEnum(ToolCategory)
  category: ToolCategory;

  @IsOptional()
  @IsUUID()
  toolTypeId?: string | null;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsEnum(ToolStatus)
  status?: ToolStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @IsOptional()
  @IsUUID()
  rackId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  // Rated cycle life. The cumulative counter (currentLifeCycle) is managed by
  // the cycle endpoints, not set here.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxLifeCycle?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

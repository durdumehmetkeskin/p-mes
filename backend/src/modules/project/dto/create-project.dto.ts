import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectStatus } from '../enums/project-status.enum';

export class CreateProjectDto {
  // Server-generated (PRJ-YYYY-NNNN). Optional + ignored if a client sends it.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsUUID()
  managerUserId?: string;

  @IsOptional()
  @IsUUID()
  customerCompanyId?: string;

  @IsOptional()
  @IsUUID()
  contactPersonId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStageTypeDto {
  // Scope to a project (omit for a global/system entry).
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  // Dynamic category (StageTypeCategory id).
  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultInput?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  defaultOutput?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

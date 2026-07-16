import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** Append a stage (built from a stage type) to an order's process. */
export class AddProcessStageDto {
  @IsUUID()
  stageTypeId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  durationHours?: number;

  // Estimates — required by the service when the process requires estimates.
  @IsOptional()
  @IsDateString()
  estimatedStartDate?: string;

  @IsOptional()
  @IsDateString()
  estimatedCompletedDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedDurationHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  input?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  output?: string;
}

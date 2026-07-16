import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/** Edit an order-specific stage. Status and sequence are managed separately. */
export class UpdateProcessStageDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  // Manually entered duration (hours).
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  durationHours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  input?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  output?: string;

  // Workers assigned to the stage — REPLACES the whole set ([] clears).
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  workerIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

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

  // Canvas position (drag & drop on the process DAG view).
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  posX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  posY?: number;
}

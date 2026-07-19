import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ProcessStageStatus } from '../enums/process-stage-status.enum';

export class UpdateProcessStageStatusDto {
  @IsEnum(ProcessStageStatus)
  status: ProcessStageStatus;

  // Completing a stage REQUIRES a manually entered duration: sent here (or
  // already stored on the stage from an earlier edit) — the service rejects
  // the completed transition without one.
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  durationHours?: number;
}

import { Type } from 'class-transformer';
import { IsDateString, IsNumber, Min } from 'class-validator';

/** Per-stage estimates supplied when creating a process from a template. */
export class ProcessStageEstimateInputDto {
  @IsDateString()
  estimatedStartDate: string;

  @IsDateString()
  estimatedCompletedDate: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedDurationHours: number;
}

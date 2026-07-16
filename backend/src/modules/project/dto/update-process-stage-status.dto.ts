import { IsEnum } from 'class-validator';
import { ProcessStageStatus } from '../enums/process-stage-status.enum';

export class UpdateProcessStageStatusDto {
  @IsEnum(ProcessStageStatus)
  status: ProcessStageStatus;
}

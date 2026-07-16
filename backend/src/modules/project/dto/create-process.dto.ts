import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProcessStageEstimateInputDto } from './process-stage-estimate-input.dto';

/**
 * Create a runtime process for an order item. When `templateId` is given, stages are
 * copied (independently) from that template and `categoryId` is taken from it.
 * Without a template, an empty process is created and `categoryId` is required.
 *
 * When `requireEstimates` is true, the process estimated dates/duration are
 * mandatory, and (for a template) `stageEstimates` must supply one entry per
 * template stage in order.
 */
export class CreateProcessDto {
  @IsUUID()
  orderItemId: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBoolean()
  requireEstimates?: boolean;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProcessStageEstimateInputDto)
  stageEstimates?: ProcessStageEstimateInputDto[];
}

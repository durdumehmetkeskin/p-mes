import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

/** Query params for the downsampled readings series endpoint. */
export class ReadingsSeriesQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  // Explicit bucket size (seconds); omit for Auto (server picks by range).
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(86400)
  bucket?: number;

  // Target point count for Auto bucketing.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(200)
  @Max(5000)
  maxPoints?: number;
}

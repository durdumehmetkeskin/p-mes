import { IsDateString, IsOptional } from 'class-validator';

/** Optional window for the section schedule (reservations overlapping it). */
export class SectionScheduleQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertCompletionReportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  summary: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  outcome?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResetToolCyclesDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class StartToolUsageDto {
  // What the tool is being used for: work order / operation / machine.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  usedFor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

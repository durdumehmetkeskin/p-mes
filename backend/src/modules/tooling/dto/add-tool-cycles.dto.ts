import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class AddToolCyclesDto {
  // Number of cycles to add to the counter.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cycles: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

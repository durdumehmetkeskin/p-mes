import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReturnToolDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ToolStatus } from '../enums/tool-status.enum';

export class ChangeToolStatusDto {
  @IsEnum(ToolStatus)
  status: ToolStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

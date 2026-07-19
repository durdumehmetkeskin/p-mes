import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ToolStatus } from '../enums/tool-status.enum';

export class ChangeToolStatusDto {
  @IsEnum(ToolStatus)
  status: ToolStatus;

  // Custody: who/where the tool goes when it enters in_use (operator, stage,
  // machine…). Ignored for other target statuses.
  @IsOptional()
  @IsString()
  @MaxLength(255)
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

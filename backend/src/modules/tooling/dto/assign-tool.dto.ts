import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AssignToolDto {
  // Assignee: operator name, work order, machine, etc.
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  assignedTo: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

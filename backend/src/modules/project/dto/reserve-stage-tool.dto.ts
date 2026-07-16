import { IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Reserve a tool for a process stage over a datetime range. */
export class ReserveStageToolDto {
  @IsUUID()
  toolId: string;

  // Wall-clock range ("...Z" ISO strings, timezone-agnostic). Both or
  // neither: omitted → the stage's full date window. Must lie within the
  // stage window (enforced in the service).
  @IsOptional()
  @IsISO8601()
  reservedFrom?: string;

  @IsOptional()
  @IsISO8601()
  reservedTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

/** Edit process-level fields (currently the responsible user). */
export class UpdateProcessDto {
  // Responsible user (from the project team); null clears it.
  @IsOptional()
  @ValidateIf((o) => o.responsibleUserId !== null)
  @IsUUID()
  responsibleUserId?: string | null;
}

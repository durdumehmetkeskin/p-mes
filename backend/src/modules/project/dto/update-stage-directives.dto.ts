import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Set/replace the stage's work directives (null/omitted clears them). */
export class UpdateStageDirectivesDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  directives?: string | null;
}

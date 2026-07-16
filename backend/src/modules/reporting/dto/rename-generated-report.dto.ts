import { IsString, MaxLength, MinLength } from 'class-validator';

export class RenameGeneratedReportDto {
  // New display file name (extension is enforced server-side).
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fileName: string;
}

import { IsISO8601 } from 'class-validator';

/** Re-date a tool reservation (wall-clock "...Z" ISO strings). */
export class UpdateStageToolReservationDto {
  @IsISO8601()
  reservedFrom: string;

  @IsISO8601()
  reservedTo: string;
}

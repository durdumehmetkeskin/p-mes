import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateSectionReservationDto {
  @IsUUID()
  sectionId: string;

  @IsUUID()
  orderId: string;

  // Optional stage this reservation is planned for. Persisted (so the stage
  // dialog can find/prefill its reservation) and the stage's estimated
  // start/end dates are synced to the reservation range server-side (so the
  // client does not need the stage-edit permission).
  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  // Optional wall-clock hours (HH:mm). Omitted → full days (00:00 / end of
  // day), so legacy clients keep working. Overlap is hour-granular: the same
  // day can serve 09:00–12:00 and 12:00–17:00.
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

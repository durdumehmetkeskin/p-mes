import { PartialType } from '@nestjs/mapped-types';
import { CreateSectionReservationDto } from './create-section-reservation.dto';

export class UpdateSectionReservationDto extends PartialType(
  CreateSectionReservationDto,
) {}

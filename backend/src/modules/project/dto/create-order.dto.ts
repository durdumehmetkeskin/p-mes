import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  projectId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  orderNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Derived server-side (pending → in_progress → completed); ignored if sent.
  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;
}

import { IsUUID } from 'class-validator';

export class ConsumeProductDto {
  // Stage that uses this product as an input.
  @IsUUID()
  stageId: string;
}

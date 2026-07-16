import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

/**
 * Warehouse re-receives a returned (returning) stock item: the responsible
 * weighs the leftover and puts it back on a rack. `quantity` is the weighed
 * amount; `rackId` is where it goes back into the available pool.
 */
export class ReceiveReturnDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  quantity: number;

  @IsUUID()
  rackId: string;
}

import { IsUUID } from 'class-validator';

/** One-sided drop-off: shelve the product on a location-storage rack. */
export class StoreProductDto {
  @IsUUID()
  storageRackId: string;
}

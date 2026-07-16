import { SetMetadata } from '@nestjs/common';

export const WAREHOUSE_SCOPED_KEY = 'warehouseScoped';

/**
 * Marks a route as reachable by a warehouse responsible even without the route's
 * global permission key. PermissionsGuard lets such users through when they are
 * responsible for at least one warehouse (coarse gate); the service layer then
 * enforces fine-grained per-warehouse scoping via WarehouseScopeService.
 */
export const WarehouseScoped = () => SetMetadata(WAREHOUSE_SCOPED_KEY, true);

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../roles/entities/role.entity';
import { SystemRole } from '../../roles/enums/system-role.enum';
import type { User } from '../../users/entities/user.entity';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { WAREHOUSE_SCOPED_KEY } from '../decorators/warehouse-scoped.decorator';

/**
 * Authorizes routes marked with @RequirePermissions(). A user passes when any
 * of their roles is the Admin system role, or when the union of their roles'
 * permissions covers every required key. Routes without the decorator are
 * left untouched (handled by other guards).
 *
 * Routes additionally marked @WarehouseScoped() are also reachable by a
 * warehouse responsible (a user responsible for >=1 warehouse) even without the
 * required key — the service layer then restricts them to their warehouses.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{
      user?: User & { responsibleWarehouseIds?: string[] };
    }>().user;
    const roles: (Role | string)[] = user?.roles ?? [];

    const isAdmin = roles.some(
      (r) => (typeof r === 'string' ? r : r?.name) === SystemRole.Admin,
    );
    if (isAdmin) {
      return true;
    }

    const granted = new Set<string>();
    for (const r of roles) {
      if (typeof r !== 'string' && Array.isArray(r.permissions)) {
        r.permissions.forEach((p) => granted.add(p));
      }
    }

    if (required.every((p) => granted.has(p))) {
      return true;
    }

    // Warehouse responsibles reach @WarehouseScoped() routes without the key;
    // the service enforces per-warehouse scoping. Coarse gate: responsible for >=1.
    const warehouseScoped = this.reflector.getAllAndOverride<boolean>(
      WAREHOUSE_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (warehouseScoped && (user?.responsibleWarehouseIds?.length ?? 0) > 0) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}

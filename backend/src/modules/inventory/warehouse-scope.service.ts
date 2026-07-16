import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Role } from '../roles/entities/role.entity';
import { SystemRole } from '../roles/enums/system-role.enum';
import type { User } from '../users/entities/user.entity';
import { Warehouse } from './entities/warehouse.entity';

/**
 * Resolved warehouse access for the current request:
 *  - `'ALL'`  → no warehouse restriction (admin or a holder of the global
 *               permission key — the existing central-manager behaviour).
 *  - `string[]` → only these warehouse ids (a warehouse responsible); an empty
 *               list means the user can see/do nothing.
 */
export type WarehouseScope = 'ALL' | string[];

/**
 * Central helper for "warehouse responsible" data scoping. Being a warehouse's
 * `responsibleUser` is itself the authorization — no extra role/permission is
 * required — but every read/write is then restricted to those warehouses in the
 * service layer (mirrors the project-membership scoping pattern).
 */
@Injectable()
export class WarehouseScopeService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouses: Repository<Warehouse>,
  ) {}

  /** Warehouse ids the given user is currently responsible for (excludes soft-deleted). */
  async responsibleWarehouseIds(userId: string): Promise<string[]> {
    const rows = await this.warehouses.find({
      where: { responsibleUserId: userId },
      select: { id: true },
    });
    return rows.map((w) => w.id);
  }

  static isAdmin(user?: Pick<User, 'roles'>): boolean {
    return Boolean(
      user?.roles?.some(
        (r: Role | string) =>
          (typeof r === 'string' ? r : r?.name) === SystemRole.Admin,
      ),
    );
  }

  /** True when the union of the user's roles' permissions contains `key`. */
  static hasKey(user: Pick<User, 'roles'>, key: string): boolean {
    return Boolean(
      user?.roles?.some(
        (r) => typeof r !== 'string' && (r.permissions ?? []).includes(key),
      ),
    );
  }

  /**
   * Resolve the warehouse scope for a request. Admins and holders of the global
   * `requiredKey` are unrestricted (`'ALL'`); everyone else is limited to the
   * warehouses they are responsible for (attached to the user by JwtStrategy).
   */
  static resolveScope(
    user:
      | (Pick<User, 'roles'> & { responsibleWarehouseIds?: string[] })
      | undefined,
    requiredKey: string,
  ): WarehouseScope {
    if (!user) return [];
    if (this.isAdmin(user) || this.hasKey(user, requiredKey)) return 'ALL';
    return user.responsibleWarehouseIds ?? [];
  }

  /**
   * Assert that `warehouseId` is inside the scope. Non-`'ALL'` scopes that don't
   * contain the id (or a missing id) throw NotFound — 404-hides existence, like
   * the project scoping's `assertProjectAccess`.
   */
  static assertInScope(
    scope: WarehouseScope,
    warehouseId: string | null | undefined,
  ): void {
    if (scope === 'ALL') return;
    if (!warehouseId || !scope.includes(warehouseId)) {
      throw new NotFoundException('Resource not found');
    }
  }
}

/**
 * Combine a resolved scope with an optional client-requested `warehouseId` into
 * the effective set of warehouse ids to filter a list by:
 *  - `undefined` → no warehouse restriction (only for an `'ALL'` scope with no request).
 *  - `string[]`  → restrict to exactly these ids (empty array → matches nothing).
 */
export function resolveWarehouseIds(
  scope: WarehouseScope,
  requested?: string,
): string[] | undefined {
  if (scope === 'ALL') return requested ? [requested] : undefined;
  if (requested) return scope.includes(requested) ? [requested] : [];
  return scope;
}

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restrict a route (or controller) to the given role names. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Runs after JwtAuthGuard. Compares the @Roles() metadata against the roles
 * on the authenticated user (loaded fresh from the DB by JwtStrategy, so they
 * are authoritative and not trusted from the token).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() on the route → authorization not required here.
    if (!required || required.length === 0) {
      return true;
    }

    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    const roleNames =
      user?.roles?.map((r) => (typeof r === 'string' ? r : r?.name)) ?? [];

    if (!user || !required.some((role) => roleNames.includes(role))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}

import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/** Injects the authenticated user attached by JwtStrategy.validate(). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    return ctx.switchToHttp().getRequest<{ user: User }>().user;
  },
);

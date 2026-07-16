import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { User } from '../users/entities/user.entity';
import { AUDIT_ACTOR_KEY, AuditActor } from './audit.constants';

/**
 * Runs after the auth guards (so request.user is populated) and stores the
 * actor in the CLS context for the duration of the request. The audit
 * subscriber reads it when writing log rows.
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest<{ user?: User }>().user;
    if (user?.id) {
      const actor: AuditActor = { id: user.id, email: user.email };
      this.cls.set(AUDIT_ACTOR_KEY, actor);
    }
    return next.handle();
  }
}

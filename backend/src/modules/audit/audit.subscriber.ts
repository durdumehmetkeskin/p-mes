import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import {
  AUDIT_ACTOR_KEY,
  AUDIT_EXCLUDED_ENTITIES,
  AuditActor,
  SENSITIVE_KEYS,
} from './audit.constants';
import { AuditLog } from './entities/audit-log.entity';
import { AuditAction } from './enums/audit-action.enum';

/**
 * Listens to every persistence event and writes an immutable audit row for
 * create/update/delete on audited entities. Runs inside the same transaction
 * as the change, so a rolled-back operation is never logged.
 */
@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(
    dataSource: DataSource,
    private readonly cls: ClsService,
  ) {
    dataSource.subscribers.push(this);
  }

  afterInsert(event: InsertEvent<unknown>): Promise<void> {
    return this.write(event, AuditAction.Create, {
      after: this.snapshot(event.entity),
    });
  }

  afterUpdate(event: UpdateEvent<unknown>): Promise<void> {
    const changedColumns = (event.updatedColumns ?? []).map(
      (c) => c.propertyName,
    );
    return this.write(event, AuditAction.Update, {
      before: this.snapshot(event.databaseEntity),
      after: this.snapshot(event.entity),
      changedColumns: changedColumns.length ? changedColumns : null,
    });
  }

  afterRemove(event: RemoveEvent<unknown>): Promise<void> {
    return this.write(event, AuditAction.Delete, {
      before: this.snapshot(event.databaseEntity ?? event.entity),
    });
  }

  afterSoftRemove(event: SoftRemoveEvent<unknown>): Promise<void> {
    return this.write(event, AuditAction.Delete, {
      before: this.snapshot(event.databaseEntity ?? event.entity),
    });
  }

  private async write(
    event: {
      manager: InsertEvent<unknown>['manager'];
      metadata: { name: string };
      entity?: unknown;
      databaseEntity?: unknown;
    },
    action: AuditAction,
    payload: {
      before?: Record<string, unknown> | null;
      after?: Record<string, unknown> | null;
      changedColumns?: string[] | null;
    },
  ): Promise<void> {
    const entityName = event.metadata.name;
    // Audit every entity except the excluded high-volume / secret ones.
    if (AUDIT_EXCLUDED_ENTITIES.has(entityName)) {
      return;
    }

    const actor = this.cls.isActive()
      ? this.cls.get<AuditActor | undefined>(AUDIT_ACTOR_KEY)
      : undefined;

    const source = (event.entity ?? event.databaseEntity) as
      | { id?: unknown }
      | undefined;

    const log = event.manager.create(AuditLog, {
      action,
      entity: entityName,
      entityId: source?.id != null ? String(source.id) : null,
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      before: payload.before ?? null,
      after: payload.after ?? null,
      changedColumns: payload.changedColumns ?? null,
    });

    // save (not insert) so the JSONB columns type-check; AuditLog is not in
    // AUDITED_ENTITIES, so this does not recurse.
    await event.manager.save(log);
  }

  /** Plain, secret-free snapshot of an entity for the JSONB columns. */
  private snapshot(entity: unknown): Record<string, unknown> | null {
    if (entity == null || typeof entity !== 'object') {
      return null;
    }
    return this.redact(entity) as Record<string, unknown>;
  }

  private redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((v) => this.redact(v));
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        if (SENSITIVE_KEYS.has(key)) {
          out[key] = '[REDACTED]';
        } else {
          out[key] = this.redact(val);
        }
      }
      return out;
    }
    return value;
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntitySubscriberInterface,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';

// Entities that must never be updated (append-only).
const NO_UPDATE: ReadonlySet<string> = new Set(['AuditLog', 'ToolStatusHistory']);

// Entities that must never be deleted (immutable history).
const NO_DELETE: ReadonlySet<string> = new Set([
  'AuditLog',
  'InventoryTransaction',
  'ToolStatusHistory',
]);

/**
 * Enforces immutability rules at the ORM layer (defence-in-depth on top of the
 * controllers, which expose no update/delete routes for these entities):
 *   - audit logs cannot be updated or deleted
 *   - stock movements (inventory transactions) cannot be deleted
 * A blocked operation throws, aborting its transaction.
 */
@Injectable()
export class ImmutabilitySubscriber implements EntitySubscriberInterface {
  constructor(dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  beforeUpdate(event: UpdateEvent<unknown>): void {
    this.guard(event.metadata.name, NO_UPDATE, 'updated');
  }

  beforeRemove(event: RemoveEvent<unknown>): void {
    this.guard(event.metadata.name, NO_DELETE, 'deleted');
  }

  beforeSoftRemove(event: SoftRemoveEvent<unknown>): void {
    this.guard(event.metadata.name, NO_DELETE, 'deleted');
  }

  private guard(
    entityName: string,
    blocked: ReadonlySet<string>,
    verb: string,
  ): void {
    if (blocked.has(entityName)) {
      throw new ForbiddenException(`${entityName} records cannot be ${verb}`);
    }
  }
}

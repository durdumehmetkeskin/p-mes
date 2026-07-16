import { ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ImmutabilitySubscriber } from './immutability.subscriber';

describe('ImmutabilitySubscriber', () => {
  let subscriber: ImmutabilitySubscriber;

  beforeEach(() => {
    const dataSource = { subscribers: [] } as unknown as DataSource;
    subscriber = new ImmutabilitySubscriber(dataSource);
  });

  const evt = (name: string) => ({ metadata: { name } }) as never;

  it('blocks updating an AuditLog', () => {
    expect(() => subscriber.beforeUpdate(evt('AuditLog'))).toThrow(
      ForbiddenException,
    );
  });

  it('blocks deleting an AuditLog', () => {
    expect(() => subscriber.beforeRemove(evt('AuditLog'))).toThrow(
      ForbiddenException,
    );
    expect(() => subscriber.beforeSoftRemove(evt('AuditLog'))).toThrow(
      ForbiddenException,
    );
  });

  it('blocks deleting an InventoryTransaction', () => {
    expect(() => subscriber.beforeRemove(evt('InventoryTransaction'))).toThrow(
      ForbiddenException,
    );
    expect(() =>
      subscriber.beforeSoftRemove(evt('InventoryTransaction')),
    ).toThrow(ForbiddenException);
  });

  it('allows updating an InventoryTransaction (only delete is blocked)', () => {
    expect(() =>
      subscriber.beforeUpdate(evt('InventoryTransaction')),
    ).not.toThrow();
  });

  it('does not affect other entities', () => {
    expect(() =>
      subscriber.beforeUpdate(evt('InventoryBalance')),
    ).not.toThrow();
    expect(() => subscriber.beforeRemove(evt('Material'))).not.toThrow();
  });
});

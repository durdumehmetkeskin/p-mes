import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '../enums/audit-action.enum';

/**
 * Append-only, immutable audit trail. One row per create/update/delete of an
 * audited entity. Never updated or deleted — it is the system of record for
 * "who changed what, when". Full before/after snapshots are kept as JSONB so
 * no data is lost.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  // Logical entity name, e.g. 'User' or 'Role'.
  @Index()
  @Column({ type: 'varchar', length: 100 })
  entity: string;

  // Primary key of the affected row (string form).
  @Index()
  @Column({ type: 'varchar', length: 100, name: 'entity_id', nullable: true })
  entityId: string | null;

  // Who did it. Nullable for unauthenticated actions (e.g. self-registration).
  @Index()
  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  // Denormalized so the actor is preserved even if that user is later deleted.
  @Column({ type: 'varchar', length: 255, name: 'actor_email', nullable: true })
  actorEmail: string | null;

  // Full row snapshot before the change (UPDATE/DELETE); null for CREATE.
  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  // Full row snapshot after the change (CREATE/UPDATE); null for DELETE.
  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  // Names of columns that changed (UPDATE only).
  @Column({
    type: 'text',
    array: true,
    name: 'changed_columns',
    nullable: true,
  })
  changedColumns: string[] | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}

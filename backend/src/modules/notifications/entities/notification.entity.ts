import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * A persistent, per-user in-app notification. `createdAt` is the notification
 * time. High-volume, so excluded from the audit trail
 * (see AUDIT_EXCLUDED_ENTITIES).
 */
@Entity('notifications')
export class Notification extends BaseEntity {
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser: User;

  @Index()
  @Column({ type: 'uuid', name: 'recipient_user_id' })
  recipientUserId: string;

  // assignment | low_stock | deadline_approaching | deadline_passed
  @Column({ type: 'varchar', length: 40 })
  type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 1000 })
  message: string;

  @Index()
  @Column({ type: 'boolean', name: 'is_read', default: false })
  read: boolean;

  // Frontend route to open when the notification is clicked.
  @Column({ type: 'varchar', length: 500, nullable: true })
  link: string | null;

  // Loose reference to the subject (for dedup + optional navigation).
  @Column({ type: 'varchar', length: 40, name: 'entity_type', nullable: true })
  entityType: string | null;

  @Index()
  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId: string | null;
}

import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AttachmentOwnerType } from '../enums/attachment-owner-type.enum';

/**
 * Metadata for a file stored in MinIO. The binary lives in object storage; this
 * row records who/what it belongs to. Attachments are immutable — they can be
 * created, read and deleted, but never edited.
 */
@Entity('attachments')
@Index(['ownerType', 'ownerId'])
export class Attachment extends BaseEntity {
  @Column({
    type: 'enum',
    enum: AttachmentOwnerType,
    enumName: 'attachment_owner_type_enum',
    name: 'owner_type',
  })
  ownerType: AttachmentOwnerType;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  // Original upload name shown to users.
  @Column({ type: 'varchar', length: 500, name: 'file_name' })
  fileName: string;

  // Key of the object in the bucket.
  @Column({ type: 'varchar', length: 500, name: 'object_key' })
  objectKey: string;

  @Column({ type: 'varchar', length: 255, name: 'content_type' })
  contentType: string;

  @Column({ type: 'int', default: 0 })
  size: number;

  @Column({ type: 'uuid', name: 'uploaded_by_id', nullable: true })
  uploadedById: string | null;
}

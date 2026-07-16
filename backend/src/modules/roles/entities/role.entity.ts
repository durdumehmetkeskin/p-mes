import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  // System roles (user/admin) cannot be renamed or deleted.
  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;

  // Granted permission keys (see permission.catalog.ts). The Admin role
  // implicitly holds all permissions regardless of this column.
  @Column({ type: 'text', array: true, default: () => "'{}'" })
  permissions: string[];
}

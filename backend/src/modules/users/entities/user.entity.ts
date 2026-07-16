import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform } from 'class-transformer';
import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  // Stored as a many-to-many relation but serialized as a list of role names
  // (string[]) to keep the API contract simple for clients.
  @ApiProperty({ type: [String], example: ['user'] })
  @Transform(
    ({ value }) =>
      Array.isArray(value)
        ? value.map((r: Role | string) => (typeof r === 'string' ? r : r?.name))
        : value,
    { toPlainOnly: true },
  )
  @ManyToMany(() => Role, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  // Never serialized in responses (ClassSerializerInterceptor strips it)
  // and hidden from the OpenAPI schema.
  @ApiHideProperty()
  @Exclude()
  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  // Not persisted. Populated per-request by JwtStrategy with the ids of the
  // warehouses this user is responsible for; drives warehouse data scoping and
  // is surfaced on GET /auth/me so clients can show the "My Warehouse" area.
  @ApiProperty({ type: [String], required: false })
  responsibleWarehouseIds?: string[];
}

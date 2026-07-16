import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Contact } from '../../customers/entities/contact.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ProjectStatus } from '../enums/project-status.enum';
import { Order } from './order.entity';

/** A project managed by a user for a customer. */
@Entity('projects')
export class Project extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  // Managing user. Nullable; SET NULL so removing the user keeps the project.
  @ManyToOne(() => User, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_user_id' })
  managerUser: User | null;

  @Index()
  @Column({ type: 'uuid', name: 'manager_user_id', nullable: true })
  managerUserId: string | null;

  @ManyToOne(() => Customer, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'customer_company_id' })
  customerCompany: Customer | null;

  @Index()
  @Column({ type: 'uuid', name: 'customer_company_id', nullable: true })
  customerCompanyId: string | null;

  @ManyToOne(() => Contact, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'contact_person_id' })
  contactPerson: Contact | null;

  @Index()
  @Column({ type: 'uuid', name: 'contact_person_id', nullable: true })
  contactPersonId: string | null;

  @Column({ type: 'date', name: 'start_date', nullable: true })
  startDate: string | null;

  @Column({ type: 'date', name: 'end_date', nullable: true })
  endDate: string | null;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    enumName: 'project_status_enum',
    default: ProjectStatus.Active,
  })
  status: ProjectStatus;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  // Assigned users (project team). A non-admin user sees only the projects
  // they are a member of.
  @ManyToMany(() => User)
  @JoinTable({
    name: 'project_members',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  // Contacts attached to this project — a subset of the customer's contacts,
  // not the whole customer contact list.
  @ManyToMany(() => Contact)
  @JoinTable({
    name: 'project_contacts',
    joinColumn: { name: 'project_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'contact_id', referencedColumnName: 'id' },
  })
  contacts: Contact[];

  // Inverse side used only to count orders (project can't be deleted while it
  // has any) — never eagerly loaded.
  @OneToMany(() => Order, (order) => order.project)
  orders: Order[];

  // Populated by loadRelationCountAndMap in the list/detail query; not a column.
  orderCount?: number;
}

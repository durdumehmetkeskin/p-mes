import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Rack } from '../../inventory/entities/rack.entity';
import { Project } from '../../project/entities/project.entity';
import { ToolCategory } from '../enums/tool-category.enum';
import { ToolStatus } from '../enums/tool-status.enum';
import { ToolType } from './tool-type.entity';

/**
 * A tool/equipment item managed by the Tooling module: molds, fixtures,
 * apparatus, cutting tools and measurement equipment. The business code is
 * unique among non-deleted tools (partial unique index).
 */
@Entity('tools')
@Index(['code'], { unique: true, where: '"deletedAt" IS NULL' })
export class Tool extends BaseEntity {
  // Unique business code for the tool (e.g. TOOL-001).
  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: ToolCategory })
  category: ToolCategory;

  // Dynamic classification. Nullable so a tool need not be typed, and so
  // deleting a type does not delete its tools (SET NULL).
  @ManyToOne(() => ToolType, {
    eager: true,
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'tool_type_id' })
  toolType: ToolType | null;

  @Index()
  @Column({ type: 'uuid', name: 'tool_type_id', nullable: true })
  toolTypeId: string | null;

  // Optional: the customer that supplied this tool and the project it is for.
  // SET NULL on delete.
  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @Index()
  @Column({ type: 'uuid', name: 'customer_id', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: Project | null;

  @Index()
  @Column({ type: 'uuid', name: 'project_id', nullable: true })
  projectId: string | null;

  @Column({ type: 'enum', enum: ToolStatus, default: ToolStatus.Available })
  status: ToolStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  manufacturer: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    name: 'serial_number',
    nullable: true,
  })
  serialNumber: string | null;

  // Storage rack within a warehouse — reuses the inventory rack system
  // (Warehouse → Rack). Nullable; SET NULL if the rack is removed.
  @ManyToOne(() => Rack, { eager: true, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rack_id' })
  rack: Rack | null;

  @Index()
  @Column({ type: 'uuid', name: 'rack_id', nullable: true })
  rackId: string | null;

  // Number of identical items under this code (e.g. cutting tool inserts).
  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'date', name: 'purchase_date', nullable: true })
  purchaseDate: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;
}

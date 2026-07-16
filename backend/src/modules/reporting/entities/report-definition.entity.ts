import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReportDataSource } from '../enums/report-data-source.enum';
import { ReportRecipe } from '../enums/report-recipe.enum';

/**
 * An editable report template. The Handlebars/HTML `content` (and optional
 * `helpers`) are stored here and passed inline to the embedded jsreport engine
 * at render time — jsreport's own store is not used, this row is the single
 * source of truth. `dataSource` selects which aggregation feeds the template.
 *
 * NOTE: `content`/`helpers` are executed server-side, so editing definitions is
 * a privileged (admin) action — see reports:create/update/delete.
 */
@Entity('report_definitions')
export class ReportDefinition extends BaseEntity {
  // Stable slug used in filenames and to upsert the seeded system reports.
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  key: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: ReportDataSource,
    enumName: 'report_data_source_enum',
    name: 'data_source',
  })
  dataSource: ReportDataSource;

  // The report's native output recipe; the render endpoint can override it.
  @Column({
    type: 'enum',
    enum: ReportRecipe,
    enumName: 'report_recipe_enum',
    default: ReportRecipe.ChromePdf,
  })
  recipe: ReportRecipe;

  @Column({ type: 'varchar', length: 50, default: 'handlebars' })
  engine: string;

  // The Handlebars/HTML template body.
  @Column({ type: 'text' })
  content: string;

  // Optional JS string of extra Handlebars helpers (merged with the built-ins).
  @Column({ type: 'text', nullable: true })
  helpers: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  // Seeded default reports — protected from deletion / key changes.
  @Column({ type: 'boolean', name: 'is_system', default: false })
  isSystem: boolean;
}

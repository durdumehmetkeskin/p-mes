import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Scopes the catalog (stage_type_categories, stage_types, workflow_templates) to
 * projects: adds a nullable project_id FK. NULL = global/system entry visible to
 * every project; a set project_id scopes the entry to that project. Existing
 * rows (seed defaults) keep NULL. The previously unique `code` indexes become
 * plain (codes may now repeat across projects).
 */
export class ProjectScopedCatalog1782520000000 implements MigrationInterface {
  name = 'ProjectScopedCatalog1782520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // code uniqueness -> plain index (per-project codes may repeat)
    await q(`DROP INDEX "UQ_stage_type_categories_code"`);
    await q(
      `CREATE INDEX "IDX_stage_type_categories_code" ON "stage_type_categories" ("code")`,
    );
    await q(`DROP INDEX "UQ_stage_types_code"`);
    await q(`CREATE INDEX "IDX_stage_types_code" ON "stage_types" ("code")`);

    const tables = [
      ['stage_type_categories', 'stage_type_categories'],
      ['stage_types', 'stage_types'],
      ['workflow_templates', 'workflow_templates'],
    ];
    for (const [table] of tables) {
      await q(`ALTER TABLE "${table}" ADD COLUMN "project_id" uuid`);
      await q(
        `CREATE INDEX "IDX_${table}_project" ON "${table}" ("project_id")`,
      );
      await q(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    for (const table of [
      'stage_type_categories',
      'stage_types',
      'workflow_templates',
    ]) {
      await q(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_project"`);
      await q(`DROP INDEX "IDX_${table}_project"`);
      await q(`ALTER TABLE "${table}" DROP COLUMN "project_id"`);
    }

    await q(`DROP INDEX "IDX_stage_types_code"`);
    await q(
      `CREATE UNIQUE INDEX "UQ_stage_types_code" ON "stage_types" ("code") WHERE "deletedAt" IS NULL`,
    );
    await q(`DROP INDEX "IDX_stage_type_categories_code"`);
    await q(
      `CREATE UNIQUE INDEX "UQ_stage_type_categories_code" ON "stage_type_categories" ("code") WHERE "deletedAt" IS NULL`,
    );
  }
}

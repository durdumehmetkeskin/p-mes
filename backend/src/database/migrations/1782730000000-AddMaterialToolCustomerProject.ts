import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional customer + project on materials and tools — a customer can send
 * materials/tools for a project.
 */
export class AddMaterialToolCustomerProject1782730000000 implements MigrationInterface {
  name = 'AddMaterialToolCustomerProject1782730000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    for (const table of ['materials', 'tools']) {
      await q(`ALTER TABLE "${table}" ADD COLUMN "customer_id" uuid`);
      await q(`ALTER TABLE "${table}" ADD COLUMN "project_id" uuid`);
      await q(
        `CREATE INDEX "IDX_${table}_customer" ON "${table}" ("customer_id")`,
      );
      await q(
        `CREATE INDEX "IDX_${table}_project" ON "${table}" ("project_id")`,
      );
      await q(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
      await q(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    for (const table of ['materials', 'tools']) {
      await q(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_project"`);
      await q(`ALTER TABLE "${table}" DROP CONSTRAINT "FK_${table}_customer"`);
      await q(`DROP INDEX "IDX_${table}_project"`);
      await q(`DROP INDEX "IDX_${table}_customer"`);
      await q(`ALTER TABLE "${table}" DROP COLUMN "project_id"`);
      await q(`ALTER TABLE "${table}" DROP COLUMN "customer_id"`);
    }
  }
}

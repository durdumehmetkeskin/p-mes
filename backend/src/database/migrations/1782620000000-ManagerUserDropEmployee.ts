import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Completes the employees→users migration: the project manager becomes a User,
 * the dead stage responsible-employee column is removed, and the Employee table
 * is dropped. CASCADE drops the dependent FK constraints by column.
 */
export class ManagerUserDropEmployee1782620000000 implements MigrationInterface {
  name = 'ManagerUserDropEmployee1782620000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // projects.manager (Employee) → manager_user_id (User)
    await q(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "manager_user_id" uuid`,
    );
    await q(
      `CREATE INDEX IF NOT EXISTS "IDX_projects_manager_user" ON "projects" ("manager_user_id")`,
    );
    await q(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_manager_user" FOREIGN KEY ("manager_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "manager_id" CASCADE`,
    );

    // process_stages.responsible_employee_id — dead since responsible→user
    await q(
      `ALTER TABLE "process_stages" DROP COLUMN IF EXISTS "responsible_employee_id" CASCADE`,
    );

    // Drop the now-unused Employee table.
    await q(`DROP TABLE IF EXISTS "employees" CASCADE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    // Best-effort reversal (Employee data is not restored).
    await q(
      `ALTER TABLE "process_stages" ADD COLUMN IF NOT EXISTS "responsible_employee_id" uuid`,
    );
    await q(
      `ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "FK_projects_manager_user"`,
    );
    await q(
      `ALTER TABLE "projects" DROP COLUMN IF EXISTS "manager_user_id" CASCADE`,
    );
    await q(
      `ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "manager_id" uuid`,
    );
  }
}

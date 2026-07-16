import { MigrationInterface, QueryRunner } from 'typeorm';

/** Responsible user (from the project team) for processes and stages. */
export class AddResponsibleUser1782610000000 implements MigrationInterface {
  name = 'AddResponsibleUser1782610000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    for (const table of ['processes', 'process_stages']) {
      await q(
        `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "responsible_user_id" uuid`,
      );
      await q(
        `CREATE INDEX IF NOT EXISTS "IDX_${table}_responsible_user" ON "${table}" ("responsible_user_id")`,
      );
      await q(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_responsible_user" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    for (const table of ['processes', 'process_stages']) {
      await q(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "FK_${table}_responsible_user"`,
      );
      await q(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "responsible_user_id"`,
      );
    }
  }
}

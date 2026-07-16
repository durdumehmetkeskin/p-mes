import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stages no longer have a responsible user — only workers. Existing stage
 * responsibles are merged into the worker set (so nobody loses board/workload
 * visibility), then the column is dropped. The PROCESS responsible is
 * untouched and keeps the managerial role.
 */
export class DropStageResponsible1783210000000 implements MigrationInterface {
  name = 'DropStageResponsible1783210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "process_stage_workers" ("stage_id", "user_id")
      SELECT s."id", s."responsible_user_id"
      FROM "process_stages" s
      WHERE s."responsible_user_id" IS NOT NULL
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query(
      `ALTER TABLE "process_stages" DROP COLUMN IF EXISTS "responsible_user_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The merged-into-workers data stays; only the column comes back (empty).
    await queryRunner.query(
      `ALTER TABLE "process_stages" ADD COLUMN IF NOT EXISTS "responsible_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL`,
    );
  }
}

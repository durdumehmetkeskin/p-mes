import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds timing columns: process_stages.started_at and processes.started_at /
 * completed_at. The stage timer starts when a stage moves to in_progress (or is
 * completed directly); the process timer starts when its first stage starts and
 * its completed_at is set once all stages are completed. Existing rows get NULL.
 */
export class AddProcessTiming1782530000000 implements MigrationInterface {
  name = 'AddProcessTiming1782530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "process_stages" ADD COLUMN "started_at" TIMESTAMP WITH TIME ZONE`,
    );
    await q(
      `ALTER TABLE "processes" ADD COLUMN "started_at" TIMESTAMP WITH TIME ZONE`,
    );
    await q(
      `ALTER TABLE "processes" ADD COLUMN "completed_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`ALTER TABLE "processes" DROP COLUMN "completed_at"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "started_at"`);
    await q(`ALTER TABLE "process_stages" DROP COLUMN "started_at"`);
  }
}

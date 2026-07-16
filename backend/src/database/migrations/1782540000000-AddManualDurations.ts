import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Manual durations: process_stages.duration_minutes is entered by the user, and
 * processes.duration_minutes holds the sum of its stages' durations.
 */
export class AddManualDurations1782540000000 implements MigrationInterface {
  name = 'AddManualDurations1782540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "process_stages" ADD COLUMN "duration_minutes" integer`,
    );
    await q(
      `ALTER TABLE "processes" ADD COLUMN "duration_minutes" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`ALTER TABLE "processes" DROP COLUMN "duration_minutes"`);
    await q(`ALTER TABLE "process_stages" DROP COLUMN "duration_minutes"`);
  }
}

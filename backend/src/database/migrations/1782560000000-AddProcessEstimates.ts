import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds planning estimates. processes.require_estimates toggles whether estimated
 * start/completed dates and duration are mandatory; processes and process_stages
 * each gain estimated_start_date, estimated_completed_date, estimated_duration_hours.
 */
export class AddProcessEstimates1782560000000 implements MigrationInterface {
  name = 'AddProcessEstimates1782560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "processes" ADD COLUMN "require_estimates" boolean NOT NULL DEFAULT false`,
    );
    await q(`ALTER TABLE "processes" ADD COLUMN "estimated_start_date" date`);
    await q(
      `ALTER TABLE "processes" ADD COLUMN "estimated_completed_date" date`,
    );
    await q(
      `ALTER TABLE "processes" ADD COLUMN "estimated_duration_hours" numeric(10,2)`,
    );
    await q(
      `ALTER TABLE "process_stages" ADD COLUMN "estimated_start_date" date`,
    );
    await q(
      `ALTER TABLE "process_stages" ADD COLUMN "estimated_completed_date" date`,
    );
    await q(
      `ALTER TABLE "process_stages" ADD COLUMN "estimated_duration_hours" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "process_stages" DROP COLUMN "estimated_duration_hours"`,
    );
    await q(
      `ALTER TABLE "process_stages" DROP COLUMN "estimated_completed_date"`,
    );
    await q(`ALTER TABLE "process_stages" DROP COLUMN "estimated_start_date"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "estimated_duration_hours"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "estimated_completed_date"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "estimated_start_date"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "require_estimates"`);
  }
}

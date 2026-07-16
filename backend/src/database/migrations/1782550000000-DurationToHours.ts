import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Switches manual durations from minutes to hours (numeric, supports fractions
 * like 1.5h). Renames duration_minutes -> duration_hours on process_stages and
 * processes, converting existing values (minutes / 60).
 */
export class DurationToHours1782550000000 implements MigrationInterface {
  name = 'DurationToHours1782550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(
      `ALTER TABLE "process_stages" RENAME COLUMN "duration_minutes" TO "duration_hours"`,
    );
    await q(
      `ALTER TABLE "process_stages" ALTER COLUMN "duration_hours" TYPE numeric(10,2) USING ROUND("duration_hours"::numeric / 60.0, 2)`,
    );

    await q(
      `ALTER TABLE "processes" ALTER COLUMN "duration_minutes" DROP DEFAULT`,
    );
    await q(
      `ALTER TABLE "processes" RENAME COLUMN "duration_minutes" TO "duration_hours"`,
    );
    await q(
      `ALTER TABLE "processes" ALTER COLUMN "duration_hours" TYPE numeric(10,2) USING ROUND("duration_hours"::numeric / 60.0, 2)`,
    );
    await q(
      `ALTER TABLE "processes" ALTER COLUMN "duration_hours" SET DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(
      `ALTER TABLE "processes" ALTER COLUMN "duration_hours" DROP DEFAULT`,
    );
    await q(
      `ALTER TABLE "processes" ALTER COLUMN "duration_hours" TYPE integer USING ROUND("duration_hours" * 60)`,
    );
    await q(
      `ALTER TABLE "processes" RENAME COLUMN "duration_hours" TO "duration_minutes"`,
    );
    await q(
      `ALTER TABLE "processes" ALTER COLUMN "duration_minutes" SET DEFAULT 0`,
    );

    await q(
      `ALTER TABLE "process_stages" ALTER COLUMN "duration_hours" TYPE integer USING ROUND("duration_hours" * 60)`,
    );
    await q(
      `ALTER TABLE "process_stages" RENAME COLUMN "duration_hours" TO "duration_minutes"`,
    );
  }
}

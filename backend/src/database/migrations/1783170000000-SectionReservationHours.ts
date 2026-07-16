import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hour-granular section reservations: start_at/end_at timestamptz (wall-clock
 * on the UTC face — "floating time") become the overlap source of truth, so
 * the same section can serve 09:00–12:00 and 12:00–17:00 on the same day.
 * Legacy rows are backfilled as full days; start_date/end_date stay for
 * display/Gantt compatibility.
 */
export class SectionReservationHours1783170000000 implements MigrationInterface {
  name = 'SectionReservationHours1783170000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "section_reservations" ADD COLUMN IF NOT EXISTS "start_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "section_reservations" ADD COLUMN IF NOT EXISTS "end_at" TIMESTAMP WITH TIME ZONE`,
    );
    // Backfill: full-day ranges on the UTC face (session-TZ independent).
    await queryRunner.query(`
      UPDATE "section_reservations" SET
        "start_at" = ("start_date"::timestamp AT TIME ZONE 'UTC'),
        "end_at" = (("end_date"::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC') - INTERVAL '1 millisecond'
      WHERE "start_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "section_reservations" DROP COLUMN IF EXISTS "end_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "section_reservations" DROP COLUMN IF EXISTS "start_at"`,
    );
  }
}

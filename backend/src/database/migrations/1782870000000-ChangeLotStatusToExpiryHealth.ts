import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repurpose the lot `status` column from a user-set lifecycle enum
 * (available/quarantine/consumed/expired) to an auto-managed expiry-health enum
 * (unknown/ok/warning/danger/expired). Old values map to `unknown` (except
 * `expired`, preserved); the real bucket is recomputed on write and by the daily
 * scanner.
 */
export class ChangeLotStatusToExpiryHealth1782870000000 implements MigrationInterface {
  name = 'ChangeLotStatusToExpiryHealth1782870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: skip if the enum was already migrated (no 'available' label).
    const legacy: unknown[] = await queryRunner.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'lots_status_enum' AND e.enumlabel = 'available'`,
    );
    if (legacy.length === 0) return;

    await queryRunner.query(
      `ALTER TABLE "lots" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "lots_status_enum" RENAME TO "lots_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "lots_status_enum" AS ENUM('unknown', 'ok', 'warning', 'danger', 'expired')`,
    );
    await queryRunner.query(`
      ALTER TABLE "lots" ALTER COLUMN "status" TYPE "lots_status_enum"
      USING (CASE "status"::text WHEN 'expired' THEN 'expired' ELSE 'unknown' END)::"lots_status_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "lots" ALTER COLUMN "status" SET DEFAULT 'unknown'`,
    );
    await queryRunner.query(`DROP TYPE "lots_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lots" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "lots_status_enum" RENAME TO "lots_status_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "lots_status_enum" AS ENUM('available', 'quarantine', 'consumed', 'expired')`,
    );
    await queryRunner.query(`
      ALTER TABLE "lots" ALTER COLUMN "status" TYPE "lots_status_enum"
      USING (CASE "status"::text WHEN 'expired' THEN 'expired' ELSE 'available' END)::"lots_status_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "lots" ALTER COLUMN "status" SET DEFAULT 'available'`,
    );
    await queryRunner.query(`DROP TYPE "lots_status_enum_new"`);
  }
}

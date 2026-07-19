import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Simplifies the tool domain to a material-style two-state lifecycle:
 * - ToolStatus shrinks to available|in_use (maintenance/calibration/retired
 *   rows are mapped to available first; the shared tools_status_enum is
 *   rebuilt for BOTH tools and tool_status_history).
 * - The cycle counter (tool_cycle_logs + current/max life cycle columns) and
 *   usage sessions (tool_usages) are removed entirely, together with the
 *   next_maintenance_date column and the related permission keys.
 */
export class SimplifyToolDomain1783360000000 implements MigrationInterface {
  name = 'SimplifyToolDomain1783360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) Map retired statuses to available on both tables.
    await queryRunner.query(
      `UPDATE "tools" SET "status" = 'available' WHERE "status"::text IN ('maintenance','calibration','retired')`,
    );
    await queryRunner.query(
      `UPDATE "tool_status_history" SET "from_status" = 'available' WHERE "from_status"::text IN ('maintenance','calibration','retired')`,
    );
    await queryRunner.query(
      `UPDATE "tool_status_history" SET "to_status" = 'available' WHERE "to_status"::text IN ('maintenance','calibration','retired')`,
    );

    // 2) Rebuild the shared enum with only the two remaining values.
    await queryRunner.query(
      `CREATE TYPE "tools_status_enum_new" AS ENUM('available','in_use')`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" ALTER COLUMN "status" TYPE "tools_status_enum_new" USING "status"::text::"tools_status_enum_new"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_status_history" ALTER COLUMN "from_status" TYPE "tools_status_enum_new" USING "from_status"::text::"tools_status_enum_new"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_status_history" ALTER COLUMN "to_status" TYPE "tools_status_enum_new" USING "to_status"::text::"tools_status_enum_new"`,
    );
    await queryRunner.query(`DROP TYPE "tools_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "tools_status_enum_new" RENAME TO "tools_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" ALTER COLUMN "status" SET DEFAULT 'available'`,
    );

    // 3) Drop usage sessions + cycle log.
    await queryRunner.query(`DROP TABLE IF EXISTS "tool_usages"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tool_usages_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tool_cycle_logs"`);

    // 4) Drop the cycle counter + maintenance-date columns.
    await queryRunner.query(
      `ALTER TABLE "tools" DROP COLUMN IF EXISTS "current_life_cycle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" DROP COLUMN IF EXISTS "max_life_cycle"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" DROP COLUMN IF EXISTS "next_maintenance_date"`,
    );

    // 5) Retire the related permission keys from every role.
    for (const key of [
      'tools:create-cycles',
      'tools:create-reset',
      'tools:create-start',
      'tools:create-end',
      'tool-usages:read',
      'tool-cycle-logs:read',
    ]) {
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = array_remove("permissions", $1) WHERE $1 = ANY("permissions")`,
        [key],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Dropped tables/rows are not recoverable; only restore the columns and
    // re-widen the enum.
    await queryRunner.query(
      `ALTER TYPE "tools_status_enum" ADD VALUE IF NOT EXISTS 'maintenance'`,
    );
    await queryRunner.query(
      `ALTER TYPE "tools_status_enum" ADD VALUE IF NOT EXISTS 'calibration'`,
    );
    await queryRunner.query(
      `ALTER TYPE "tools_status_enum" ADD VALUE IF NOT EXISTS 'retired'`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "current_life_cycle" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "max_life_cycle" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "next_maintenance_date" date`,
    );
  }
}

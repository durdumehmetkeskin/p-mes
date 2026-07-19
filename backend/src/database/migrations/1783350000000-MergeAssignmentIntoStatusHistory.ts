import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Merges the tool "assignment" concept into the status trail: custody now
 * rides on tool_status_history (an in_use row records who/where the tool
 * went; the next non-in_use row IS the return). The separate tool_assignments
 * table, its endpoints and permission keys are removed — historical
 * assignment rows are dropped by user decision (no backfill).
 */
export class MergeAssignmentIntoStatusHistory1783350000000
  implements MigrationInterface
{
  name = 'MergeAssignmentIntoStatusHistory1783350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tool_status_history" ADD COLUMN IF NOT EXISTS "assigned_to" character varying(255)`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tool_assignments"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "tool_assignments_status_enum"`,
    );
    // Retire the assignment permission keys from every role.
    for (const key of [
      'tool-assignments:read',
      'tools:create-assign',
      'tools:create-return',
    ]) {
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = array_remove("permissions", $1) WHERE $1 = ANY("permissions")`,
        [key],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The dropped assignment rows are not recoverable; only the column is.
    await queryRunner.query(
      `ALTER TABLE "tool_status_history" DROP COLUMN IF EXISTS "assigned_to"`,
    );
  }
}

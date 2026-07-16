import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A stage may now reserve the SAME tool in several disjoint time ranges (one
 * row per range, e.g. 09:00–12:00 on three consecutive days): the unique
 * (stage_id, tool_id) index becomes a plain lookup index. Overlaps are
 * rejected in the service across ALL rows of the tool (own stage included).
 */
export class MultiRangeToolReservations1783230000000
  implements MigrationInterface
{
  name = 'MultiRangeToolReservations1783230000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_stage_tool"`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stage_tool_res_stage_tool"
       ON "stage_tool_reservations" ("stage_id", "tool_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_stage_tool_res_stage_tool"`);
    // NOTE: restoring uniqueness fails if multi-range rows exist — delete
    // extras first.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_stage_tool"
       ON "stage_tool_reservations" ("stage_id", "tool_id")
       WHERE "deletedAt" IS NULL`,
    );
  }
}

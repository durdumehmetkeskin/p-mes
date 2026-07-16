import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tool reservations get their own from–to datetime range (wall-clock stored
 * on the UTC face of timestamptz — "floating time"). Legacy NULL rows fall
 * back to the stage's date window at check time, so no backfill.
 */
export class ToolReservationRange1783160000000 implements MigrationInterface {
  name = 'ToolReservationRange1783160000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "reserved_from" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "reserved_to" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "reserved_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "reserved_from"`,
    );
  }
}

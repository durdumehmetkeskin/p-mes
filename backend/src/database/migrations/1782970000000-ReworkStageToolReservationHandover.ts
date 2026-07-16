import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rework tool-stage reservations into a material-style QR handover: a `status`
 * enum (reserved→delivering→received→returning→returned) replaces the `occupied`
 * flag, plus delivered/returned audit columns. Backfills existing rows from the
 * old `received_at`/`occupied` state.
 */
export class ReworkStageToolReservationHandover1782970000000 implements MigrationInterface {
  name = 'ReworkStageToolReservationHandover1782970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='stage_tool_reservations_status_enum') THEN
        CREATE TYPE "stage_tool_reservations_status_enum" AS ENUM('reserved','delivering','received','returning','returned');
      END IF;
    END $$;`);
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "status" "stage_tool_reservations_status_enum" NOT NULL DEFAULT 'reserved'`,
    );
    // Backfill: rows that were already received map to `received`; the rest stay
    // `reserved`. (No prior delivering/returning state existed.)
    await queryRunner.query(
      `UPDATE "stage_tool_reservations" SET "status" = 'received' WHERE "received_at" IS NOT NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "delivered_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "returned_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "returned_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stage_tool_res_delivered_by') THEN
        ALTER TABLE "stage_tool_reservations" ADD CONSTRAINT "FK_stage_tool_res_delivered_by" FOREIGN KEY ("delivered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stage_tool_res_returned_by') THEN
        ALTER TABLE "stage_tool_reservations" ADD CONSTRAINT "FK_stage_tool_res_returned_by" FOREIGN KEY ("returned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;`);

    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "occupied"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "occupied" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "stage_tool_reservations" SET "occupied" = true WHERE "status" IN ('delivering','received','returning')`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP CONSTRAINT IF EXISTS "FK_stage_tool_res_delivered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP CONSTRAINT IF EXISTS "FK_stage_tool_res_returned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "delivered_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "delivered_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "returned_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "returned_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "stage_tool_reservations_status_enum"`,
    );
  }
}

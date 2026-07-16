import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tool handover: the stage responsible receives a reserved tool (occupying it)
 * before the stage may start. Adds received_by/received_at to
 * stage_tool_reservations.
 */
export class AddStageToolReceive1782960000000 implements MigrationInterface {
  name = 'AddStageToolReceive1782960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "received_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stage_tool_res_received_by') THEN
        ALTER TABLE "stage_tool_reservations" ADD CONSTRAINT "FK_stage_tool_res_received_by" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP CONSTRAINT IF EXISTS "FK_stage_tool_res_received_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "received_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_tool_reservations" DROP COLUMN IF EXISTS "received_at"`,
    );
  }
}

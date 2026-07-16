import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tools reserved for a process stage. The stage can't start until every
 * reserved tool is available; starting occupies them (→ in_use), completing
 * releases them (→ available).
 */
export class AddStageToolReservations1782950000000 implements MigrationInterface {
  name = 'AddStageToolReservations1782950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stage_tool_reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "stage_id" uuid NOT NULL,
        "tool_id" uuid NOT NULL,
        "note" character varying(500),
        "occupied" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_stage_tool_reservations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stage_tool_res_stage" ON "stage_tool_reservations" ("stage_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_stage_tool_res_tool" ON "stage_tool_reservations" ("tool_id")`,
    );
    // One reservation per (stage, tool) among non-deleted rows.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_stage_tool" ON "stage_tool_reservations" ("stage_id", "tool_id") WHERE "deletedAt" IS NULL`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stage_tool_res_stage') THEN
        ALTER TABLE "stage_tool_reservations" ADD CONSTRAINT "FK_stage_tool_res_stage" FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id") ON DELETE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stage_tool_res_tool') THEN
        ALTER TABLE "stage_tool_reservations" ADD CONSTRAINT "FK_stage_tool_res_tool" FOREIGN KEY ("tool_id") REFERENCES "tools"("id") ON DELETE CASCADE;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stage_tool_reservations"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cycle counter for tools: cumulative `current_life_cycle` (auto-incremented at
 * each production/usage end) vs. rated `max_life_cycle`, plus an immutable
 * `tool_cycle_logs` audit of every change.
 */
export class AddToolCycleCounter1782460000000 implements MigrationInterface {
  name = 'AddToolCycleCounter1782460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `ALTER TABLE "tools" ADD "current_life_cycle" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(`ALTER TABLE "tools" ADD "max_life_cycle" integer`);

    await queryRunner.query(`
      CREATE TABLE "tool_cycle_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "tool_id" uuid NOT NULL,
        "cycles" integer NOT NULL,
        "resulting_life_cycle" integer NOT NULL,
        "source" character varying(50) NOT NULL,
        "note" character varying(500),
        "recorded_by_id" uuid,
        "recorded_by_email" character varying(255),
        CONSTRAINT "PK_tool_cycle_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tool_cycle_logs_tool_id" ON "tool_cycle_logs" ("tool_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "tool_cycle_logs"
      ADD CONSTRAINT "FK_tool_cycle_logs_tool"
      FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tool_cycle_logs"`);
    await queryRunner.query(`ALTER TABLE "tools" DROP COLUMN "max_life_cycle"`);
    await queryRunner.query(
      `ALTER TABLE "tools" DROP COLUMN "current_life_cycle"`,
    );
  }
}

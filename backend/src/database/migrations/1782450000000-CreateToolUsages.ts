import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tool usage sessions (utilisation/wear tracking). At most one ONGOING session
 * per tool; ending it stamps ended_at + duration_minutes. FK to tools (CASCADE).
 */
export class CreateToolUsages1782450000000 implements MigrationInterface {
  name = 'CreateToolUsages1782450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "tool_usages_status_enum" AS ENUM('ongoing', 'completed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "tool_usages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "tool_id" uuid NOT NULL,
        "used_for" character varying(255),
        "status" "tool_usages_status_enum" NOT NULL DEFAULT 'ongoing',
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ended_at" TIMESTAMP WITH TIME ZONE,
        "duration_minutes" integer,
        "quantity" numeric(14,3),
        "note" character varying(500),
        "recorded_by_id" uuid,
        "recorded_by_email" character varying(255),
        CONSTRAINT "PK_tool_usages_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tool_usages_tool_id" ON "tool_usages" ("tool_id")`,
    );
    // At most one ONGOING usage session per tool.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tool_usages_ongoing"
      ON "tool_usages" ("tool_id")
      WHERE "status" = 'ongoing' AND "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tool_usages"
      ADD CONSTRAINT "FK_tool_usages_tool"
      FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tool_usages"`);
    await queryRunner.query(`DROP TYPE "tool_usages_status_enum"`);
  }
}

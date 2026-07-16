import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only history of tool status transitions. Reuses the existing
 * `tools_status_enum` type for from/to. FK to tools (CASCADE on delete).
 */
export class CreateToolStatusHistory1782420000000 implements MigrationInterface {
  name = 'CreateToolStatusHistory1782420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "tool_status_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "tool_id" uuid NOT NULL,
        "from_status" "tools_status_enum",
        "to_status" "tools_status_enum" NOT NULL,
        "note" character varying(500),
        "changed_by_id" uuid,
        "changed_by_email" character varying(255),
        CONSTRAINT "PK_tool_status_history_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tsh_tool_id" ON "tool_status_history" ("tool_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "tool_status_history"
      ADD CONSTRAINT "FK_tsh_tool"
      FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tool_status_history"`);
  }
}

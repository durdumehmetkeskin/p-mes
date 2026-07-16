import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tool assignments (checkouts). One ACTIVE assignment per tool at a time;
 * returning sets returned_at and flips status. FK to tools (CASCADE).
 */
export class CreateToolAssignments1782440000000 implements MigrationInterface {
  name = 'CreateToolAssignments1782440000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "tool_assignments_status_enum" AS ENUM('active', 'returned')`,
    );
    await queryRunner.query(`
      CREATE TABLE "tool_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "tool_id" uuid NOT NULL,
        "assigned_to" character varying(255) NOT NULL,
        "status" "tool_assignments_status_enum" NOT NULL DEFAULT 'active',
        "note" character varying(500),
        "assigned_by_id" uuid,
        "assigned_by_email" character varying(255),
        "returned_at" TIMESTAMP WITH TIME ZONE,
        "returned_by_id" uuid,
        "returned_by_email" character varying(255),
        "return_note" character varying(500),
        CONSTRAINT "PK_tool_assignments_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_tool_assignments_tool_id" ON "tool_assignments" ("tool_id")`,
    );
    // At most one ACTIVE assignment per tool.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_tool_assignments_active"
      ON "tool_assignments" ("tool_id")
      WHERE "status" = 'active' AND "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "tool_assignments"
      ADD CONSTRAINT "FK_tool_assignments_tool"
      FOREIGN KEY ("tool_id") REFERENCES "tools"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tool_assignments"`);
    await queryRunner.query(`DROP TYPE "tool_assignments_status_enum"`);
  }
}

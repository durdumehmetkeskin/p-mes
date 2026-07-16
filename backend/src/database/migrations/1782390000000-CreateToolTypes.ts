import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the dynamic `tool_types` table and links tools to it via a nullable
 * `tool_type_id` FK (SET NULL). Seeds a few common starter types (deletable).
 */
export class CreateToolTypes1782390000000 implements MigrationInterface {
  name = 'CreateToolTypes1782390000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "tool_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_tool_types_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tool_types_name" ON "tool_types" ("name")`,
    );

    // Seed common starter types (users can edit/delete these).
    await queryRunner.query(`
      INSERT INTO "tool_types" ("name", "description") VALUES
        ('End Mill', 'Milling cutter'),
        ('Drill', 'Drilling tool'),
        ('Insert', 'Indexable cutting insert'),
        ('Gauge', 'Measurement gauge'),
        ('Injection Mold', 'Plastic injection mold')
    `);

    await queryRunner.query(`ALTER TABLE "tools" ADD "tool_type_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_tools_tool_type_id" ON "tools" ("tool_type_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "tools"
      ADD CONSTRAINT "FK_tools_tool_type"
      FOREIGN KEY ("tool_type_id") REFERENCES "tool_types"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tools" DROP CONSTRAINT "FK_tools_tool_type"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tools_tool_type_id"`);
    await queryRunner.query(`ALTER TABLE "tools" DROP COLUMN "tool_type_id"`);
    await queryRunner.query(`DROP TABLE "tool_types"`);
  }
}

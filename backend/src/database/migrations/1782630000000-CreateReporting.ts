import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reporting module: editable report templates (report_definitions) and the
 * generated-report history (generated_reports; binaries live in MinIO).
 */
export class CreateReporting1782630000000 implements MigrationInterface {
  name = 'CreateReporting1782630000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await q(
      `CREATE TYPE "report_data_source_enum" AS ENUM('project-production','work-order','workload','inventory-tooling')`,
    );
    await q(
      `CREATE TYPE "report_recipe_enum" AS ENUM('chrome-pdf','html-to-xlsx')`,
    );
    await q(`CREATE TYPE "report_format_enum" AS ENUM('pdf','xlsx')`);

    await q(`
      CREATE TABLE "report_definitions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "key" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "data_source" "report_data_source_enum" NOT NULL,
        "recipe" "report_recipe_enum" NOT NULL DEFAULT 'chrome-pdf',
        "engine" character varying(50) NOT NULL DEFAULT 'handlebars',
        "content" text NOT NULL,
        "helpers" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_report_definitions_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "IDX_report_definitions_key" ON "report_definitions" ("key")`,
    );

    await q(`
      CREATE TABLE "generated_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "definition_id" uuid NOT NULL,
        "definition_name" character varying(255) NOT NULL,
        "format" "report_format_enum" NOT NULL,
        "parameters" jsonb,
        "file_name" character varying(500) NOT NULL,
        "object_key" character varying(500) NOT NULL,
        "content_type" character varying(255) NOT NULL,
        "size" integer NOT NULL DEFAULT 0,
        "generated_by_id" uuid,
        CONSTRAINT "PK_generated_reports_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_generated_reports_definition_id" ON "generated_reports" ("definition_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`DROP TABLE IF EXISTS "generated_reports"`);
    await q(`DROP TABLE IF EXISTS "report_definitions"`);
    await q(`DROP TYPE IF EXISTS "report_format_enum"`);
    await q(`DROP TYPE IF EXISTS "report_recipe_enum"`);
    await q(`DROP TYPE IF EXISTS "report_data_source_enum"`);
  }
}

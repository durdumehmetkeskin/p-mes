import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes stage-type categories dynamic: introduces a stage_type_categories table
 * (seeded with planning/production), converts stage_types.category (enum) into a
 * FK (category_id), backfilling existing rows by code. The stage_category_enum
 * type is kept — workflow templates and processes still use it for the workflow
 * kind (planning/production).
 */
export class DynamicStageTypeCategories1782500000000 implements MigrationInterface {
  name = 'DynamicStageTypeCategories1782500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(`
      CREATE TABLE "stage_type_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "color" character varying(20),
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_stage_type_categories_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_stage_type_categories_code" ON "stage_type_categories" ("code") WHERE "deletedAt" IS NULL`,
    );

    // Seed defaults matching the existing enum values.
    await q(`
      INSERT INTO "stage_type_categories" ("code","name","sort_order") VALUES
        ('planning','Planning',0),
        ('production','Production',1)`);

    // Convert stage_types.category (enum) -> category_id (FK).
    await q(`ALTER TABLE "stage_types" ADD COLUMN "category_id" uuid`);
    await q(`
      UPDATE "stage_types" st
      SET "category_id" = c."id"
      FROM "stage_type_categories" c
      WHERE c."code" = st."category"::text`);
    await q(
      `ALTER TABLE "stage_types" ALTER COLUMN "category_id" SET NOT NULL`,
    );
    await q(`ALTER TABLE "stage_types" DROP COLUMN "category"`);
    await q(
      `CREATE INDEX "IDX_stage_types_category" ON "stage_types" ("category_id")`,
    );
    await q(
      `ALTER TABLE "stage_types" ADD CONSTRAINT "FK_stage_types_category" FOREIGN KEY ("category_id") REFERENCES "stage_type_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    await q(
      `ALTER TABLE "stage_types" ADD COLUMN "category" "stage_category_enum"`,
    );
    // Custom categories outside the enum fall back to 'planning'.
    await q(`
      UPDATE "stage_types" st
      SET "category" = (CASE WHEN c."code" IN ('planning','production')
                             THEN c."code" ELSE 'planning' END)::"stage_category_enum"
      FROM "stage_type_categories" c
      WHERE c."id" = st."category_id"`);
    await q(`ALTER TABLE "stage_types" ALTER COLUMN "category" SET NOT NULL`);
    await q(
      `ALTER TABLE "stage_types" DROP CONSTRAINT "FK_stage_types_category"`,
    );
    await q(`DROP INDEX "IDX_stage_types_category"`);
    await q(`ALTER TABLE "stage_types" DROP COLUMN "category_id"`);
    await q(`DROP TABLE "stage_type_categories"`);
  }
}

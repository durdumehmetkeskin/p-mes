import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage (type) categories are removed entirely — processes and workflow
 * templates no longer carry a category: the FK columns are dropped, the
 * stage_type_categories table is dropped, and the
 * stage-type-categories:* permission keys are stripped from every role.
 */
export class DropStageCategories1783300000000 implements MigrationInterface {
  name = 'DropStageCategories1783300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "processes" DROP COLUMN IF EXISTS "category_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_templates" DROP COLUMN IF EXISTS "category_id"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "stage_type_categories" CASCADE`,
    );
    for (const key of [
      'stage-type-categories:read',
      'stage-type-categories:create',
      'stage-type-categories:update',
      'stage-type-categories:delete',
    ]) {
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = array_remove("permissions", $1)`,
        [key],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data-destructive removal — only the empty structures come back.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stage_type_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "project_id" uuid,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "color" character varying(20),
        "sort_order" integer NOT NULL DEFAULT 0,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_stage_type_categories_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "processes" ADD COLUMN IF NOT EXISTS "category_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_templates" ADD COLUMN IF NOT EXISTS "category_id" uuid`,
    );
  }
}

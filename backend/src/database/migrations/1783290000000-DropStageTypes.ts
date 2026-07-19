import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage types are removed entirely — a stage is identified by its NAME alone
 * (categories stay: they classify processes/templates, not stages).
 * - Template stages without an explicit name inherit their type's name first.
 * - stage_type_id columns are dropped from process_stages and
 *   workflow_template_stages; the stage_types table is dropped.
 * - stage-types:* permission keys are stripped from every role.
 */
export class DropStageTypes1783290000000 implements MigrationInterface {
  name = 'DropStageTypes1783290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Preserve display names before the type link disappears.
    await queryRunner.query(`
      UPDATE "workflow_template_stages" wts
      SET "name" = st."name"
      FROM "stage_types" st
      WHERE wts."name" IS NULL AND st."id" = wts."stage_type_id"
    `);
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stages" DROP COLUMN IF EXISTS "stage_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "process_stages" DROP COLUMN IF EXISTS "stage_type_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "stage_types" CASCADE`);
    for (const key of [
      'stage-types:read',
      'stage-types:create',
      'stage-types:update',
      'stage-types:delete',
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
      CREATE TABLE IF NOT EXISTS "stage_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "deletedAt" timestamptz,
        "project_id" uuid,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "category_id" uuid NOT NULL,
        "default_input" character varying(255),
        "default_output" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_stage_types_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "process_stages" ADD COLUMN IF NOT EXISTS "stage_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stages" ADD COLUMN IF NOT EXISTS "stage_type_id" uuid`,
    );
  }
}

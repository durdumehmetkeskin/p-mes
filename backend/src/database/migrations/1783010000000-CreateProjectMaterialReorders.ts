import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-project reorder (critical-stock) levels for materials. Independent of
 * order requirements — one row per (project, material) among non-deleted rows.
 */
export class CreateProjectMaterialReorders1783010000000 implements MigrationInterface {
  name = 'CreateProjectMaterialReorders1783010000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_material_reorders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "project_id" uuid NOT NULL,
        "material_id" uuid NOT NULL,
        "reorder_level" numeric(14,3) NOT NULL DEFAULT '0',
        CONSTRAINT "PK_project_material_reorders_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pmreorder_project_id" ON "project_material_reorders" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pmreorder_material_id" ON "project_material_reorders" ("material_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_project_material_reorder"
      ON "project_material_reorders" ("project_id", "material_id")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "project_material_reorders"
      ADD CONSTRAINT "FK_pmreorder_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "project_material_reorders"
      ADD CONSTRAINT "FK_pmreorder_material"
      FOREIGN KEY ("material_id") REFERENCES "materials"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_material_reorders" DROP CONSTRAINT "FK_pmreorder_material"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_material_reorders" DROP CONSTRAINT "FK_pmreorder_project"`,
    );
    await queryRunner.query(`DROP TABLE "project_material_reorders"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-project required-materials list with a project-specific reorder level.
 * One row per (project, material) among non-deleted rows.
 */
export class CreateProjectMaterialRequirements1782880000000 implements MigrationInterface {
  name = 'CreateProjectMaterialRequirements1782880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "project_material_requirements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "project_id" uuid NOT NULL,
        "material_id" uuid NOT NULL,
        "reorder_level" numeric(14,3) NOT NULL DEFAULT '0',
        "note" character varying(500),
        CONSTRAINT "PK_project_material_requirements_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_pmr_project_id" ON "project_material_requirements" ("project_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pmr_material_id" ON "project_material_requirements" ("material_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_project_material_requirement"
      ON "project_material_requirements" ("project_id", "material_id")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "project_material_requirements"
      ADD CONSTRAINT "FK_pmr_project"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "project_material_requirements"
      ADD CONSTRAINT "FK_pmr_material"
      FOREIGN KEY ("material_id") REFERENCES "materials"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "project_material_requirements" DROP CONSTRAINT "FK_pmr_material"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_material_requirements" DROP CONSTRAINT "FK_pmr_project"`,
    );
    await queryRunner.query(`DROP TABLE "project_material_requirements"`);
  }
}

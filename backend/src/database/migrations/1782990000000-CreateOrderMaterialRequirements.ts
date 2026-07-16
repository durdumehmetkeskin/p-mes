import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Required materials move from project scope to order scope. Existing
 * project-level data is intentionally discarded (no project→order mapping);
 * the new per-(order, material) table starts empty.
 *
 * Dev note: synchronize:true creates the new table but never drops the old
 * one — this migration must run in development too.
 */
export class CreateOrderMaterialRequirements1782990000000 implements MigrationInterface {
  name = 'CreateOrderMaterialRequirements1782990000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "project_material_requirements"`,
    );
    await queryRunner.query(`
      CREATE TABLE "order_material_requirements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "order_id" uuid NOT NULL,
        "material_id" uuid NOT NULL,
        "reorder_level" numeric(14,3) NOT NULL DEFAULT '0',
        "note" character varying(500),
        CONSTRAINT "PK_order_material_requirements_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_omr_order_id" ON "order_material_requirements" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_omr_material_id" ON "order_material_requirements" ("material_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_order_material_requirement"
      ON "order_material_requirements" ("order_id", "material_id")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "order_material_requirements"
      ADD CONSTRAINT "FK_omr_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "order_material_requirements"
      ADD CONSTRAINT "FK_omr_material"
      FOREIGN KEY ("material_id") REFERENCES "materials"("id")
      ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_material_requirements" DROP CONSTRAINT "FK_omr_material"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_material_requirements" DROP CONSTRAINT "FK_omr_order"`,
    );
    await queryRunner.query(`DROP TABLE "order_material_requirements"`);
    // Recreate the old project-level table empty (its data was dropped in up()).
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
}

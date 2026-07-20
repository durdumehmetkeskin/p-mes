import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Materials are customer/project-agnostic by design — the association lives on
 * the lot (and its stock). Drops the vestigial `materials.customer_id` and
 * `materials.project_id` columns (their FKs/indexes go with them).
 */
export class DropMaterialCustomerProject1783050000000 implements MigrationInterface {
  name = 'DropMaterialCustomerProject1783050000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN IF EXISTS "customer_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN IF EXISTS "project_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "materials"
        ADD "customer_id" uuid,
        ADD "project_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "materials"
        ADD CONSTRAINT "FK_materials_customer" FOREIGN KEY ("customer_id")
          REFERENCES "customers"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_materials_project" FOREIGN KEY ("project_id")
          REFERENCES "projects"("id") ON DELETE SET NULL
    `);
  }
}

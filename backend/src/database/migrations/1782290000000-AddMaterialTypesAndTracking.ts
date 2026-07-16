import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the dynamic `material_types` table and links materials to it, plus the
 * lot/serial tracking flags. Seeds a few common types (deletable).
 */
export class AddMaterialTypesAndTracking1782290000000 implements MigrationInterface {
  name = 'AddMaterialTypesAndTracking1782290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "material_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_material_types_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_material_types_name" ON "material_types" ("name")`,
    );

    // Seed common starter types (users can edit/delete these).
    await queryRunner.query(`
      INSERT INTO "material_types" ("name", "description") VALUES
        ('Raw Material', 'Unprocessed input materials'),
        ('Component', 'Parts used in assemblies'),
        ('Finished Good', 'Completed sellable products'),
        ('Consumable', 'Supplies consumed during production')
    `);

    await queryRunner.query(
      `ALTER TABLE "materials" ADD "material_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD "is_lot_tracked" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD "is_serial_tracked" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_materials_material_type_id" ON "materials" ("material_type_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "materials"
      ADD CONSTRAINT "FK_materials_material_type"
      FOREIGN KEY ("material_type_id") REFERENCES "material_types"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" DROP CONSTRAINT "FK_materials_material_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_materials_material_type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN "is_serial_tracked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN "is_lot_tracked"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN "material_type_id"`,
    );
    await queryRunner.query(`DROP TABLE "material_types"`);
  }
}

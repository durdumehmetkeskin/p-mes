import { MigrationInterface, QueryRunner } from 'typeorm';

const ENUM_UNITS = ['piece', 'kg', 'g', 'l', 'm', 'box', 'pallet'] as const;

/**
 * Replaces the fixed `materials.unit` enum with a dynamic, user-managed
 * `material_units` lookup table (same pattern as `material_types`). Seeds the
 * seven former enum values, backfills the new FK from the old column, then
 * drops the enum column and type.
 */
export class MaterialUnitLookup1783020000000 implements MigrationInterface {
  name = 'MaterialUnitLookup1783020000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "material_units" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_material_units_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_material_units_name" ON "material_units" ("name")`,
    );

    // Seed the former enum values (users can rename/extend these).
    await queryRunner.query(`
      INSERT INTO "material_units" ("name") VALUES
        ${ENUM_UNITS.map((u) => `('${u}')`).join(', ')}
    `);

    await queryRunner.query(
      `ALTER TABLE "materials" ADD "material_unit_id" uuid`,
    );
    // Backfill from the old enum column by name; the old column is NOT NULL so
    // every material (including soft-deleted rows) maps to a seeded unit.
    await queryRunner.query(`
      UPDATE "materials" m
      SET "material_unit_id" = mu."id"
      FROM "material_units" mu
      WHERE mu."name" = m."unit"::text
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_materials_material_unit_id" ON "materials" ("material_unit_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "materials"
      ADD CONSTRAINT "FK_materials_material_unit"
      FOREIGN KEY ("material_unit_id") REFERENCES "material_units"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "unit"`);
    await queryRunner.query(`DROP TYPE "materials_unit_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "materials_unit_enum" AS ENUM(${ENUM_UNITS.map((u) => `'${u}'`).join(', ')})
    `);
    await queryRunner.query(`
      ALTER TABLE "materials"
      ADD "unit" "materials_unit_enum" NOT NULL DEFAULT 'piece'
    `);
    // Restore from the lookup where the name still matches an enum value;
    // renamed/custom units fall back to the 'piece' default.
    await queryRunner.query(`
      UPDATE "materials" m
      SET "unit" = mu."name"::"materials_unit_enum"
      FROM "material_units" mu
      WHERE m."material_unit_id" = mu."id"
        AND mu."name" IN (${ENUM_UNITS.map((u) => `'${u}'`).join(', ')})
    `);
    await queryRunner.query(
      `ALTER TABLE "materials" DROP CONSTRAINT "FK_materials_material_unit"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_materials_material_unit_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN "material_unit_id"`,
    );
    await queryRunner.query(`DROP TABLE "material_units"`);
  }
}

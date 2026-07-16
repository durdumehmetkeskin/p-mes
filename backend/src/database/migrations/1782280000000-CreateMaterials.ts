import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaterials1782280000000 implements MigrationInterface {
  name = 'CreateMaterials1782280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "materials_unit_enum" AS ENUM('piece', 'kg', 'g', 'l', 'm', 'box', 'pallet')`,
    );
    await queryRunner.query(`
      CREATE TABLE "materials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "sku" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "unit" "materials_unit_enum" NOT NULL DEFAULT 'piece',
        "quantity" numeric(14,3) NOT NULL DEFAULT '0',
        "reorder_level" numeric(14,3) NOT NULL DEFAULT '0',
        "unit_price" numeric(14,2),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_materials_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_materials_sku" ON "materials" ("sku")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "materials"`);
    await queryRunner.query(`DROP TYPE "materials_unit_enum"`);
  }
}

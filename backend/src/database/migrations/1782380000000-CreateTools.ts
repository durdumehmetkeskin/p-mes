import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTools1782380000000 implements MigrationInterface {
  name = 'CreateTools1782380000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "tools_category_enum" AS ENUM('mold', 'fixture', 'apparatus', 'cutting_tool', 'measurement_equipment')`,
    );
    await queryRunner.query(
      `CREATE TYPE "tools_status_enum" AS ENUM('available', 'in_use', 'maintenance', 'calibration', 'retired')`,
    );
    await queryRunner.query(`
      CREATE TABLE "tools" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "category" "tools_category_enum" NOT NULL,
        "status" "tools_status_enum" NOT NULL DEFAULT 'available',
        "description" character varying(1000),
        "manufacturer" character varying(255),
        "serial_number" character varying(100),
        "location" character varying(255),
        "quantity" integer NOT NULL DEFAULT 1,
        "purchase_date" date,
        "next_maintenance_date" date,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_tools_id" PRIMARY KEY ("id")
      )
    `);
    // Code unique among non-deleted tools (allows reuse after soft-delete).
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tools_code" ON "tools" ("code") WHERE "deletedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tools"`);
    await queryRunner.query(`DROP TYPE "tools_status_enum"`);
    await queryRunner.query(`DROP TYPE "tools_category_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Material lots/batches. The (material_id, lot_number) pair is unique among
 * non-deleted rows via a partial unique index, so a lot number frees up after
 * a lot is soft-deleted.
 */
export class CreateLots1782320000000 implements MigrationInterface {
  name = 'CreateLots1782320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "lots_status_enum" AS ENUM('available', 'quarantine', 'consumed', 'expired')`,
    );
    await queryRunner.query(`
      CREATE TABLE "lots" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "lot_number" character varying(50) NOT NULL,
        "material_id" uuid NOT NULL,
        "location_id" uuid,
        "quantity" numeric(14,3) NOT NULL DEFAULT '0',
        "expiry_date" date,
        "status" "lots_status_enum" NOT NULL DEFAULT 'available',
        CONSTRAINT "PK_lots_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_lots_material_id" ON "lots" ("material_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_lots_location_id" ON "lots" ("location_id")`,
    );
    // Unique lot number per material, ignoring soft-deleted rows.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_lots_material_lot_number"
      ON "lots" ("material_id", "lot_number")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "lots"
      ADD CONSTRAINT "FK_lots_material"
      FOREIGN KEY ("material_id") REFERENCES "materials"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "lots"
      ADD CONSTRAINT "FK_lots_location"
      FOREIGN KEY ("location_id") REFERENCES "locations"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lots" DROP CONSTRAINT "FK_lots_location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" DROP CONSTRAINT "FK_lots_material"`,
    );
    await queryRunner.query(`DROP TABLE "lots"`);
    await queryRunner.query(`DROP TYPE "lots_status_enum"`);
  }
}

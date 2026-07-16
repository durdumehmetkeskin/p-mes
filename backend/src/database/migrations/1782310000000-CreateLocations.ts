import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Storage locations within warehouses. The (warehouse_id, code) pair is unique
 * among non-deleted rows via a partial unique index, so a code can be reused
 * after a location is soft-deleted.
 */
export class CreateLocations1782310000000 implements MigrationInterface {
  name = 'CreateLocations1782310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "code" character varying(50) NOT NULL,
        "name" character varying(255),
        "description" character varying(1000),
        "warehouse_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_locations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_locations_warehouse_id" ON "locations" ("warehouse_id")`,
    );
    // Unique location code per warehouse, ignoring soft-deleted rows.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_locations_warehouse_code"
      ON "locations" ("warehouse_id", "code")
      WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD CONSTRAINT "FK_locations_warehouse"
      FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_locations_warehouse"`,
    );
    await queryRunner.query(`DROP TABLE "locations"`);
  }
}

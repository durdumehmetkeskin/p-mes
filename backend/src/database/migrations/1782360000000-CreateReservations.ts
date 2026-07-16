import { MigrationInterface, QueryRunner } from 'typeorm';

/** Soft stock holds — do not affect physical balances, only AvailableStock. */
export class CreateReservations1782360000000 implements MigrationInterface {
  name = 'CreateReservations1782360000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "reservations_status_enum" AS ENUM('active', 'released', 'fulfilled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "material_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "location_id" uuid,
        "lot_id" uuid,
        "quantity" numeric(14,3) NOT NULL,
        "status" "reservations_status_enum" NOT NULL DEFAULT 'active',
        "note" character varying(500),
        CONSTRAINT "PK_reservations_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_resv_material" ON "reservations" ("material_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resv_warehouse" ON "reservations" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_resv_status" ON "reservations" ("status")`,
    );

    const fks: Array<[string, string, string]> = [
      ['material_id', 'materials', 'FK_resv_material'],
      ['warehouse_id', 'warehouses', 'FK_resv_warehouse'],
      ['location_id', 'locations', 'FK_resv_location'],
      ['lot_id', 'lots', 'FK_resv_lot'],
    ];
    for (const [col, table, name] of fks) {
      await queryRunner.query(`
        ALTER TABLE "reservations"
        ADD CONSTRAINT "${name}" FOREIGN KEY ("${col}")
        REFERENCES "${table}"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(`DROP TYPE "reservations_status_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stock balances per (material, warehouse, location, lot). The combination is
 * unique among non-deleted rows via a COALESCE-based partial unique index, so
 * NULL location/lot collapse to a single slot (NULLs are otherwise distinct in
 * a normal unique index).
 */
export class CreateInventoryBalances1782330000000 implements MigrationInterface {
  name = 'CreateInventoryBalances1782330000000';

  // Sentinel used to fold NULL location/lot into the unique index.
  private readonly NIL = '00000000-0000-0000-0000-000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "inventory_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "material_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "location_id" uuid,
        "lot_id" uuid,
        "quantity" numeric(14,3) NOT NULL DEFAULT '0',
        CONSTRAINT "PK_inventory_balances_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_bal_material" ON "inventory_balances" ("material_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_bal_warehouse" ON "inventory_balances" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_bal_location" ON "inventory_balances" ("location_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_bal_lot" ON "inventory_balances" ("lot_id")`,
    );

    // Unique combination, treating NULL location/lot as the NIL sentinel.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_inv_bal_combo"
      ON "inventory_balances" (
        "material_id",
        "warehouse_id",
        COALESCE("location_id", '${this.NIL}'::uuid),
        COALESCE("lot_id", '${this.NIL}'::uuid)
      )
      WHERE "deletedAt" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "inventory_balances"
      ADD CONSTRAINT "FK_inv_bal_material" FOREIGN KEY ("material_id")
      REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_balances"
      ADD CONSTRAINT "FK_inv_bal_warehouse" FOREIGN KEY ("warehouse_id")
      REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_balances"
      ADD CONSTRAINT "FK_inv_bal_location" FOREIGN KEY ("location_id")
      REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory_balances"
      ADD CONSTRAINT "FK_inv_bal_lot" FOREIGN KEY ("lot_id")
      REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inventory_balances"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/** Immutable stock movement records (IN / OUT / TRANSFER). */
export class CreateInventoryTransactions1782340000000 implements MigrationInterface {
  name = 'CreateInventoryTransactions1782340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "inventory_transactions_type_enum" AS ENUM('in', 'out', 'transfer')`,
    );
    await queryRunner.query(`
      CREATE TABLE "inventory_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "type" "inventory_transactions_type_enum" NOT NULL,
        "material_id" uuid NOT NULL,
        "quantity" numeric(14,3) NOT NULL,
        "source_warehouse_id" uuid,
        "source_location_id" uuid,
        "source_lot_id" uuid,
        "target_warehouse_id" uuid,
        "target_location_id" uuid,
        "target_lot_id" uuid,
        "note" character varying(500),
        CONSTRAINT "PK_inventory_transactions_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_tx_material" ON "inventory_transactions" ("material_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_tx_type" ON "inventory_transactions" ("type")`,
    );

    const fks: Array<[string, string, string]> = [
      ['material_id', 'materials', 'FK_inv_tx_material'],
      ['source_warehouse_id', 'warehouses', 'FK_inv_tx_src_wh'],
      ['source_location_id', 'locations', 'FK_inv_tx_src_loc'],
      ['source_lot_id', 'lots', 'FK_inv_tx_src_lot'],
      ['target_warehouse_id', 'warehouses', 'FK_inv_tx_tgt_wh'],
      ['target_location_id', 'locations', 'FK_inv_tx_tgt_loc'],
      ['target_lot_id', 'lots', 'FK_inv_tx_tgt_lot'],
    ];
    // material is CASCADE (required); the slot refs are SET NULL.
    for (const [col, table, name] of fks) {
      const onDelete = col === 'material_id' ? 'CASCADE' : 'SET NULL';
      await queryRunner.query(`
        ALTER TABLE "inventory_transactions"
        ADD CONSTRAINT "${name}" FOREIGN KEY ("${col}")
        REFERENCES "${table}"("id") ON DELETE ${onDelete} ON UPDATE NO ACTION
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "inventory_transactions"`);
    await queryRunner.query(`DROP TYPE "inventory_transactions_type_enum"`);
  }
}

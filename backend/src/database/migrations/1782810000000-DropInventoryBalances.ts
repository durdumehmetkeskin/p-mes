import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the inventory_balances table — on-hand stock is now the aggregation of
 * stock_items, so there is no stored balances table anymore.
 */
export class DropInventoryBalances1782810000000 implements MigrationInterface {
  name = 'DropInventoryBalances1782810000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_balances"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort recreate of the removed table (feature retired).
    await queryRunner.query(`
      CREATE TABLE "inventory_balances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "material_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "rack_id" uuid,
        "lot_id" uuid,
        "quantity" numeric(14,3) NOT NULL DEFAULT '0',
        CONSTRAINT "PK_inventory_balances_id" PRIMARY KEY ("id")
      )
    `);
  }
}

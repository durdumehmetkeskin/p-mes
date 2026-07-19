import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Indexes for the stock-movements list: it sorts by created_at DESC and
 * filters by source/target warehouse (warehouse-responsible scoping), none of
 * which were indexed — every page load was a full-table sort/scan.
 */
export class AddInvTxListIndexes1783270000000 implements MigrationInterface {
  name = 'AddInvTxListIndexes1783270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inv_tx_created_at" ON "inventory_transactions" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inv_tx_source_warehouse_id" ON "inventory_transactions" ("source_warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inv_tx_target_warehouse_id" ON "inventory_transactions" ("target_warehouse_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_tx_created_at"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inv_tx_source_warehouse_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_inv_tx_target_warehouse_id"`,
    );
  }
}

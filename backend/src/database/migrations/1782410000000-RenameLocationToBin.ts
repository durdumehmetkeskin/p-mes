import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Renames the "Location" domain concept to "Bin" across the schema: the
 * `locations` table → `bins`, and every `*_location_id` FK column → `*_bin_id`,
 * along with their constraint/index names. Data is preserved (pure renames);
 * Postgres auto-updates the FK definitions and the COALESCE-based unique index
 * on inventory_balances when the column is renamed.
 */
export class RenameLocationToBin1782410000000 implements MigrationInterface {
  name = 'RenameLocationToBin1782410000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const stmts = [
      // --- locations table → bins ---
      `ALTER TABLE "locations" RENAME TO "bins"`,
      `ALTER TABLE "bins" RENAME CONSTRAINT "PK_locations_id" TO "PK_bins_id"`,
      `ALTER TABLE "bins" RENAME CONSTRAINT "FK_locations_warehouse" TO "FK_bins_warehouse"`,
      `ALTER INDEX "IDX_locations_warehouse_id" RENAME TO "IDX_bins_warehouse_id"`,
      `ALTER INDEX "UQ_locations_warehouse_code" RENAME TO "UQ_bins_warehouse_code"`,

      // --- lots ---
      `ALTER TABLE "lots" RENAME COLUMN "location_id" TO "bin_id"`,
      `ALTER TABLE "lots" RENAME CONSTRAINT "FK_lots_location" TO "FK_lots_bin"`,
      `ALTER INDEX "IDX_lots_location_id" RENAME TO "IDX_lots_bin_id"`,

      // --- inventory_balances (UQ_inv_bal_combo COALESCE expr auto-updates) ---
      `ALTER TABLE "inventory_balances" RENAME COLUMN "location_id" TO "bin_id"`,
      `ALTER TABLE "inventory_balances" RENAME CONSTRAINT "FK_inv_bal_location" TO "FK_inv_bal_bin"`,
      `ALTER INDEX "IDX_inv_bal_location" RENAME TO "IDX_inv_bal_bin"`,

      // --- inventory_transactions (source + target legs) ---
      `ALTER TABLE "inventory_transactions" RENAME COLUMN "source_location_id" TO "source_bin_id"`,
      `ALTER TABLE "inventory_transactions" RENAME COLUMN "target_location_id" TO "target_bin_id"`,
      `ALTER TABLE "inventory_transactions" RENAME CONSTRAINT "FK_inv_tx_src_loc" TO "FK_inv_tx_src_bin"`,
      `ALTER TABLE "inventory_transactions" RENAME CONSTRAINT "FK_inv_tx_tgt_loc" TO "FK_inv_tx_tgt_bin"`,

      // --- reservations (no index on the column) ---
      `ALTER TABLE "reservations" RENAME COLUMN "location_id" TO "bin_id"`,
      `ALTER TABLE "reservations" RENAME CONSTRAINT "FK_resv_location" TO "FK_resv_bin"`,

      // --- tools ---
      `ALTER TABLE "tools" RENAME COLUMN "location_id" TO "bin_id"`,
      `ALTER TABLE "tools" RENAME CONSTRAINT "FK_tools_location" TO "FK_tools_bin"`,
      `ALTER INDEX "IDX_tools_location_id" RENAME TO "IDX_tools_bin_id"`,
    ];
    for (const sql of stmts) {
      await queryRunner.query(sql);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const stmts = [
      // --- tools ---
      `ALTER INDEX "IDX_tools_bin_id" RENAME TO "IDX_tools_location_id"`,
      `ALTER TABLE "tools" RENAME CONSTRAINT "FK_tools_bin" TO "FK_tools_location"`,
      `ALTER TABLE "tools" RENAME COLUMN "bin_id" TO "location_id"`,

      // --- reservations ---
      `ALTER TABLE "reservations" RENAME CONSTRAINT "FK_resv_bin" TO "FK_resv_location"`,
      `ALTER TABLE "reservations" RENAME COLUMN "bin_id" TO "location_id"`,

      // --- inventory_transactions ---
      `ALTER TABLE "inventory_transactions" RENAME CONSTRAINT "FK_inv_tx_tgt_bin" TO "FK_inv_tx_tgt_loc"`,
      `ALTER TABLE "inventory_transactions" RENAME CONSTRAINT "FK_inv_tx_src_bin" TO "FK_inv_tx_src_loc"`,
      `ALTER TABLE "inventory_transactions" RENAME COLUMN "target_bin_id" TO "target_location_id"`,
      `ALTER TABLE "inventory_transactions" RENAME COLUMN "source_bin_id" TO "source_location_id"`,

      // --- inventory_balances ---
      `ALTER INDEX "IDX_inv_bal_bin" RENAME TO "IDX_inv_bal_location"`,
      `ALTER TABLE "inventory_balances" RENAME CONSTRAINT "FK_inv_bal_bin" TO "FK_inv_bal_location"`,
      `ALTER TABLE "inventory_balances" RENAME COLUMN "bin_id" TO "location_id"`,

      // --- lots ---
      `ALTER INDEX "IDX_lots_bin_id" RENAME TO "IDX_lots_location_id"`,
      `ALTER TABLE "lots" RENAME CONSTRAINT "FK_lots_bin" TO "FK_lots_location"`,
      `ALTER TABLE "lots" RENAME COLUMN "bin_id" TO "location_id"`,

      // --- bins table → locations ---
      `ALTER INDEX "UQ_bins_warehouse_code" RENAME TO "UQ_locations_warehouse_code"`,
      `ALTER INDEX "IDX_bins_warehouse_id" RENAME TO "IDX_locations_warehouse_id"`,
      `ALTER TABLE "bins" RENAME CONSTRAINT "FK_bins_warehouse" TO "FK_locations_warehouse"`,
      `ALTER TABLE "bins" RENAME CONSTRAINT "PK_bins_id" TO "PK_locations_id"`,
      `ALTER TABLE "bins" RENAME TO "locations"`,
    ];
    for (const sql of stmts) {
      await queryRunner.query(sql);
    }
  }
}

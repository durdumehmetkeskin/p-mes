import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Introduces the Warehouse → Zone → Rack hierarchy.
 *
 * - Renames the existing `bins` table → `zones` (it becomes the grouping level).
 * - Creates `racks` (the finest-grained, stock-bearing level) under zones.
 * - Seeds one default rack ("R1") per zone so existing stock can be moved down.
 * - Re-points every stock reference (`*_bin_id`) from the zone to that zone's
 *   default rack (`*_rack_id`), preserving all quantities, then drops the old
 *   bin columns.
 */
export class RenameBinToZoneAddRacks1782430000000 implements MigrationInterface {
  name = 'RenameBinToZoneAddRacks1782430000000';

  private readonly NIL = '00000000-0000-0000-0000-000000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // 1) bins -> zones (rename table + its constraints/indexes).
    await q(`ALTER TABLE "bins" RENAME TO "zones"`);
    await q(
      `ALTER TABLE "zones" RENAME CONSTRAINT "PK_bins_id" TO "PK_zones_id"`,
    );
    await q(
      `ALTER TABLE "zones" RENAME CONSTRAINT "FK_bins_warehouse" TO "FK_zones_warehouse"`,
    );
    await q(
      `ALTER INDEX "IDX_bins_warehouse_id" RENAME TO "IDX_zones_warehouse_id"`,
    );
    await q(
      `ALTER INDEX "UQ_bins_warehouse_code" RENAME TO "UQ_zones_warehouse_code"`,
    );

    // 2) racks table (child of zone).
    await q(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await q(`
      CREATE TABLE "racks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "code" character varying(50) NOT NULL,
        "name" character varying(255),
        "description" character varying(1000),
        "zone_id" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_racks_id" PRIMARY KEY ("id")
      )
    `);
    await q(`CREATE INDEX "IDX_racks_zone_id" ON "racks" ("zone_id")`);
    await q(
      `CREATE UNIQUE INDEX "UQ_racks_zone_code" ON "racks" ("zone_id", "code") WHERE "deletedAt" IS NULL`,
    );
    await q(`
      ALTER TABLE "racks" ADD CONSTRAINT "FK_racks_zone"
      FOREIGN KEY ("zone_id") REFERENCES "zones"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // 3) one default rack per zone.
    await q(`
      INSERT INTO "racks" ("code", "name", "zone_id", "is_active")
      SELECT 'R1', 'Default rack', z."id", true FROM "zones" z
    `);

    // 4) per stock table: add rack_id, move from the zone's default rack,
    //    drop the old bin_id wiring.

    // inventory_balances (combo unique index references the column).
    await q(`ALTER TABLE "inventory_balances" ADD "rack_id" uuid`);
    await q(`
      UPDATE "inventory_balances" b SET "rack_id" = r."id"
      FROM "racks" r WHERE r."zone_id" = b."bin_id"
    `);
    await q(`DROP INDEX "UQ_inv_bal_combo"`);
    await q(
      `ALTER TABLE "inventory_balances" DROP CONSTRAINT "FK_inv_bal_bin"`,
    );
    await q(`DROP INDEX "IDX_inv_bal_bin"`);
    await q(`ALTER TABLE "inventory_balances" DROP COLUMN "bin_id"`);
    await q(
      `CREATE INDEX "IDX_inv_bal_rack" ON "inventory_balances" ("rack_id")`,
    );
    await q(`
      CREATE UNIQUE INDEX "UQ_inv_bal_combo" ON "inventory_balances" (
        "material_id", "warehouse_id",
        COALESCE("rack_id", '${this.NIL}'::uuid),
        COALESCE("lot_id", '${this.NIL}'::uuid)
      ) WHERE "deletedAt" IS NULL
    `);
    await q(`
      ALTER TABLE "inventory_balances" ADD CONSTRAINT "FK_inv_bal_rack"
      FOREIGN KEY ("rack_id") REFERENCES "racks"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // lots
    await q(`ALTER TABLE "lots" ADD "rack_id" uuid`);
    await q(
      `UPDATE "lots" l SET "rack_id" = r."id" FROM "racks" r WHERE r."zone_id" = l."bin_id"`,
    );
    await q(`ALTER TABLE "lots" DROP CONSTRAINT "FK_lots_bin"`);
    await q(`DROP INDEX "IDX_lots_bin_id"`);
    await q(`ALTER TABLE "lots" DROP COLUMN "bin_id"`);
    await q(`CREATE INDEX "IDX_lots_rack_id" ON "lots" ("rack_id")`);
    await q(`
      ALTER TABLE "lots" ADD CONSTRAINT "FK_lots_rack"
      FOREIGN KEY ("rack_id") REFERENCES "racks"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // reservations (no index on the column originally)
    await q(`ALTER TABLE "reservations" ADD "rack_id" uuid`);
    await q(
      `UPDATE "reservations" rs SET "rack_id" = r."id" FROM "racks" r WHERE r."zone_id" = rs."bin_id"`,
    );
    await q(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_resv_bin"`);
    await q(`ALTER TABLE "reservations" DROP COLUMN "bin_id"`);
    await q(`
      ALTER TABLE "reservations" ADD CONSTRAINT "FK_resv_rack"
      FOREIGN KEY ("rack_id") REFERENCES "racks"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // tools
    await q(`ALTER TABLE "tools" ADD "rack_id" uuid`);
    await q(
      `UPDATE "tools" t SET "rack_id" = r."id" FROM "racks" r WHERE r."zone_id" = t."bin_id"`,
    );
    await q(`ALTER TABLE "tools" DROP CONSTRAINT "FK_tools_bin"`);
    await q(`DROP INDEX "IDX_tools_bin_id"`);
    await q(`ALTER TABLE "tools" DROP COLUMN "bin_id"`);
    await q(`CREATE INDEX "IDX_tools_rack_id" ON "tools" ("rack_id")`);
    await q(`
      ALTER TABLE "tools" ADD CONSTRAINT "FK_tools_rack"
      FOREIGN KEY ("rack_id") REFERENCES "racks"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // inventory_transactions (source + target legs)
    await q(`ALTER TABLE "inventory_transactions" ADD "source_rack_id" uuid`);
    await q(`ALTER TABLE "inventory_transactions" ADD "target_rack_id" uuid`);
    await q(`
      UPDATE "inventory_transactions" x SET "source_rack_id" = r."id"
      FROM "racks" r WHERE r."zone_id" = x."source_bin_id"
    `);
    await q(`
      UPDATE "inventory_transactions" x SET "target_rack_id" = r."id"
      FROM "racks" r WHERE r."zone_id" = x."target_bin_id"
    `);
    await q(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_inv_tx_src_bin"`,
    );
    await q(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_inv_tx_tgt_bin"`,
    );
    await q(`ALTER TABLE "inventory_transactions" DROP COLUMN "source_bin_id"`);
    await q(`ALTER TABLE "inventory_transactions" DROP COLUMN "target_bin_id"`);
    await q(`
      ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_src_rack"
      FOREIGN KEY ("source_rack_id") REFERENCES "racks"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await q(`
      ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_tgt_rack"
      FOREIGN KEY ("target_rack_id") REFERENCES "racks"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // Reverse: re-add bin_id from each rack's zone, drop rack wiring, rename
    // zones -> bins. (Default racks are discarded.)

    // inventory_transactions
    await q(`ALTER TABLE "inventory_transactions" ADD "source_bin_id" uuid`);
    await q(`ALTER TABLE "inventory_transactions" ADD "target_bin_id" uuid`);
    await q(`
      UPDATE "inventory_transactions" x SET "source_bin_id" = r."zone_id"
      FROM "racks" r WHERE r."id" = x."source_rack_id"
    `);
    await q(`
      UPDATE "inventory_transactions" x SET "target_bin_id" = r."zone_id"
      FROM "racks" r WHERE r."id" = x."target_rack_id"
    `);
    await q(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_inv_tx_src_rack"`,
    );
    await q(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_inv_tx_tgt_rack"`,
    );
    await q(
      `ALTER TABLE "inventory_transactions" DROP COLUMN "source_rack_id"`,
    );
    await q(
      `ALTER TABLE "inventory_transactions" DROP COLUMN "target_rack_id"`,
    );

    // tools
    await q(`ALTER TABLE "tools" ADD "bin_id" uuid`);
    await q(
      `UPDATE "tools" t SET "bin_id" = r."zone_id" FROM "racks" r WHERE r."id" = t."rack_id"`,
    );
    await q(`ALTER TABLE "tools" DROP CONSTRAINT "FK_tools_rack"`);
    await q(`DROP INDEX "IDX_tools_rack_id"`);
    await q(`ALTER TABLE "tools" DROP COLUMN "rack_id"`);
    await q(`CREATE INDEX "IDX_tools_bin_id" ON "tools" ("bin_id")`);

    // reservations
    await q(`ALTER TABLE "reservations" ADD "bin_id" uuid`);
    await q(
      `UPDATE "reservations" rs SET "bin_id" = r."zone_id" FROM "racks" r WHERE r."id" = rs."rack_id"`,
    );
    await q(`ALTER TABLE "reservations" DROP CONSTRAINT "FK_resv_rack"`);
    await q(`ALTER TABLE "reservations" DROP COLUMN "rack_id"`);

    // lots
    await q(`ALTER TABLE "lots" ADD "bin_id" uuid`);
    await q(
      `UPDATE "lots" l SET "bin_id" = r."zone_id" FROM "racks" r WHERE r."id" = l."rack_id"`,
    );
    await q(`ALTER TABLE "lots" DROP CONSTRAINT "FK_lots_rack"`);
    await q(`DROP INDEX "IDX_lots_rack_id"`);
    await q(`ALTER TABLE "lots" DROP COLUMN "rack_id"`);
    await q(`CREATE INDEX "IDX_lots_bin_id" ON "lots" ("bin_id")`);

    // inventory_balances
    await q(`ALTER TABLE "inventory_balances" ADD "bin_id" uuid`);
    await q(`
      UPDATE "inventory_balances" b SET "bin_id" = r."zone_id"
      FROM "racks" r WHERE r."id" = b."rack_id"
    `);
    await q(`DROP INDEX "UQ_inv_bal_combo"`);
    await q(
      `ALTER TABLE "inventory_balances" DROP CONSTRAINT "FK_inv_bal_rack"`,
    );
    await q(`DROP INDEX "IDX_inv_bal_rack"`);
    await q(`ALTER TABLE "inventory_balances" DROP COLUMN "rack_id"`);
    await q(
      `CREATE INDEX "IDX_inv_bal_bin" ON "inventory_balances" ("bin_id")`,
    );
    await q(`
      CREATE UNIQUE INDEX "UQ_inv_bal_combo" ON "inventory_balances" (
        "material_id", "warehouse_id",
        COALESCE("bin_id", '${this.NIL}'::uuid),
        COALESCE("lot_id", '${this.NIL}'::uuid)
      ) WHERE "deletedAt" IS NULL
    `);

    // drop racks
    await q(`DROP TABLE "racks"`);

    // zones -> bins
    await q(
      `ALTER INDEX "UQ_zones_warehouse_code" RENAME TO "UQ_bins_warehouse_code"`,
    );
    await q(
      `ALTER INDEX "IDX_zones_warehouse_id" RENAME TO "IDX_bins_warehouse_id"`,
    );
    await q(
      `ALTER TABLE "zones" RENAME CONSTRAINT "FK_zones_warehouse" TO "FK_bins_warehouse"`,
    );
    await q(
      `ALTER TABLE "zones" RENAME CONSTRAINT "PK_zones_id" TO "PK_bins_id"`,
    );
    await q(`ALTER TABLE "zones" RENAME TO "bins"`);

    // restore old FKs that pointed to bins
    await q(`
      ALTER TABLE "inventory_balances" ADD CONSTRAINT "FK_inv_bal_bin"
      FOREIGN KEY ("bin_id") REFERENCES "bins"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await q(`
      ALTER TABLE "lots" ADD CONSTRAINT "FK_lots_bin"
      FOREIGN KEY ("bin_id") REFERENCES "bins"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await q(`
      ALTER TABLE "reservations" ADD CONSTRAINT "FK_resv_bin"
      FOREIGN KEY ("bin_id") REFERENCES "bins"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await q(`
      ALTER TABLE "tools" ADD CONSTRAINT "FK_tools_bin"
      FOREIGN KEY ("bin_id") REFERENCES "bins"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await q(`
      ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_src_bin"
      FOREIGN KEY ("source_bin_id") REFERENCES "bins"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await q(`
      ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_tgt_bin"
      FOREIGN KEY ("target_bin_id") REFERENCES "bins"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }
}

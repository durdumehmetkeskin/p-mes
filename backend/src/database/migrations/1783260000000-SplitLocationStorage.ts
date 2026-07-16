import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Splits the location's storage area from the Warehouse entity entirely.
 * New Section-like children of Location: `location_storages` (one per
 * location) + `location_storage_racks`. Data moves over from the old
 * auto-created per-location warehouses (LOC-*, hidden MAIN zone):
 * racks are copied (legacy_rack_id keeps the mapping), product shelving is
 * remapped to the new racks, the LOC warehouses/zones/racks are soft-deleted
 * (stray stock references stay resolvable), and `warehouses.location_id`
 * is dropped — warehouses are a pure inventory concept again.
 */
export class SplitLocationStorage1783260000000 implements MigrationInterface {
  name = 'SplitLocationStorage1783260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) New tables.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "location_storages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "location_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_location_storages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_location_storages_location" FOREIGN KEY ("location_id")
          REFERENCES "locations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_location_storages_location"
        ON "location_storages" ("location_id") WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "location_storage_racks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "storage_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "note" character varying(1000),
        "is_active" boolean NOT NULL DEFAULT true,
        "legacy_rack_id" uuid,
        CONSTRAINT "PK_location_storage_racks_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_location_storage_racks_storage" FOREIGN KEY ("storage_id")
          REFERENCES "location_storages"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_location_storage_racks_storage_code"
        ON "location_storage_racks" ("storage_id", "code") WHERE "deletedAt" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_location_storage_racks_storage_id"
        ON "location_storage_racks" ("storage_id")
    `);

    // 2) One storage per location that had a warehouse (keep old code/name).
    await queryRunner.query(`
      INSERT INTO "location_storages" ("location_id", "code", "name")
      SELECT w."location_id", w."code", w."name"
      FROM "warehouses" w
      WHERE w."location_id" IS NOT NULL AND w."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "location_storages" s
          WHERE s."location_id" = w."location_id" AND s."deletedAt" IS NULL
        )
    `);

    // 3) Copy the MAIN-zone racks over (legacy_rack_id keeps the mapping).
    await queryRunner.query(`
      INSERT INTO "location_storage_racks" ("storage_id", "code", "note", "legacy_rack_id")
      SELECT s."id", r."code",
             NULLIF(TRIM(CONCAT_WS(' — ', r."name", r."description")), ''),
             r."id"
      FROM "racks" r
      JOIN "zones" z ON z."id" = r."zone_id" AND z."code" = 'MAIN' AND z."deletedAt" IS NULL
      JOIN "warehouses" w ON w."id" = z."warehouse_id"
        AND w."location_id" IS NOT NULL AND w."deletedAt" IS NULL
      JOIN "location_storages" s ON s."location_id" = w."location_id" AND s."deletedAt" IS NULL
      WHERE r."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "location_storage_racks" nr WHERE nr."legacy_rack_id" = r."id"
        )
    `);

    // 4) Products: new shelf column, remap, drop the old columns.
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "storage_rack_id" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_products_storage_rack'
        ) THEN
          ALTER TABLE "products" ADD CONSTRAINT "FK_products_storage_rack"
            FOREIGN KEY ("storage_rack_id") REFERENCES "location_storage_racks"("id")
            ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_products_storage_rack_id"
        ON "products" ("storage_rack_id")
    `);
    await queryRunner.query(`
      UPDATE "products" p SET "storage_rack_id" = nr."id"
      FROM "location_storage_racks" nr
      WHERE p."rack_id" IS NOT NULL AND nr."legacy_rack_id" = p."rack_id"
    `);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "rack_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "warehouse_id"`,
    );

    // 5) Retire the old per-location warehouses (SOFT delete — any stray
    //    stock/history references keep resolving withDeleted).
    await queryRunner.query(`
      UPDATE "racks" SET "deletedAt" = now()
      WHERE "deletedAt" IS NULL AND "zone_id" IN (
        SELECT z."id" FROM "zones" z
        JOIN "warehouses" w ON w."id" = z."warehouse_id"
        WHERE w."location_id" IS NOT NULL
      )
    `);
    await queryRunner.query(`
      UPDATE "zones" SET "deletedAt" = now()
      WHERE "deletedAt" IS NULL AND "warehouse_id" IN (
        SELECT "id" FROM "warehouses" WHERE "location_id" IS NOT NULL
      )
    `);
    await queryRunner.query(`
      UPDATE "warehouses" SET "deletedAt" = now()
      WHERE "deletedAt" IS NULL AND "location_id" IS NOT NULL
    `);

    // 6) Sever the coupling: warehouses know nothing about locations anymore.
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "FK_warehouses_location"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_warehouses_location"`);
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "location_id"`,
    );

    // 7) Locations that never had a warehouse still get a storage row.
    await queryRunner.query(`
      INSERT INTO "location_storages" ("location_id", "code", "name")
      SELECT l."id",
             LEFT('DEPO-' || COALESCE(NULLIF(REGEXP_REPLACE(l."code", '[^A-Za-z0-9_-]', '-', 'g'), ''), 'LOKASYON'), 50),
             l."name" || ' Depo Alanı'
      FROM "locations" l
      WHERE l."deletedAt" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "location_storages" s
          WHERE s."location_id" = l."id" AND s."deletedAt" IS NULL
        )
    `);

    // 8) Copy each role's racks:X grant to storage-racks:X (idempotent).
    for (const verb of ['read', 'create', 'update', 'delete']) {
      await queryRunner.query(
        `UPDATE "roles"
         SET "permissions" = ARRAY(
           SELECT DISTINCT unnest("permissions" || $1::text[])
         )
         WHERE $2 = ANY("permissions")`,
        [[`storage-racks:${verb}`], `racks:${verb}`],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reversal (mirrors 1783090000000-LocationStorage).
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "location_id" uuid`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_warehouses_location'
        ) THEN
          ALTER TABLE "warehouses" ADD CONSTRAINT "FK_warehouses_location"
            FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    await queryRunner.query(`
      UPDATE "warehouses" SET "deletedAt" = NULL WHERE "location_id" IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "zones" z SET "deletedAt" = NULL
      FROM "warehouses" w
      WHERE z."warehouse_id" = w."id" AND w."location_id" IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "racks" r SET "deletedAt" = NULL
      FROM "zones" z JOIN "warehouses" w ON w."id" = z."warehouse_id"
      WHERE r."zone_id" = z."id" AND w."location_id" IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "rack_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "warehouse_id" uuid`,
    );
    await queryRunner.query(`
      UPDATE "products" p SET "rack_id" = nr."legacy_rack_id"
      FROM "location_storage_racks" nr
      WHERE p."storage_rack_id" = nr."id" AND nr."legacy_rack_id" IS NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "storage_rack_id"`,
    );
    for (const verb of ['read', 'create', 'update', 'delete']) {
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = array_remove("permissions", $1)`,
        [`storage-racks:${verb}`],
      );
    }
    await queryRunner.query(`DROP TABLE IF EXISTS "location_storage_racks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "location_storages"`);
  }
}

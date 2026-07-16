import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every production location owns exactly ONE storage area: a warehouse linked
 * via warehouses.location_id (partial unique index), holding racks under a
 * hidden 'MAIN' zone. Produced Products are stored on those racks. Backfills a
 * warehouse + MAIN zone for every existing location (LocationsService creates
 * them for new locations).
 */
export class LocationStorage1783090000000 implements MigrationInterface {
  name = 'LocationStorage1783090000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "location_id" uuid`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_warehouses_location"
      ON "warehouses" ("location_id")
      WHERE "deletedAt" IS NULL AND "location_id" IS NOT NULL
    `);
    // Guarded — dev (synchronize:true) may already have created the FK.
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_warehouses_location'
        ) THEN
          ALTER TABLE "warehouses"
          ADD CONSTRAINT "FK_warehouses_location"
          FOREIGN KEY ("location_id") REFERENCES "locations"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$
    `);

    // Backfill: one warehouse + hidden MAIN zone per existing location.
    const locations: Array<{ id: string; code: string; name: string }> =
      await queryRunner.query(`
        SELECT l."id", l."code", l."name" FROM "locations" l
        WHERE l."deletedAt" IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM "warehouses" w
            WHERE w."location_id" = l."id" AND w."deletedAt" IS NULL
          )
      `);
    const existingCodes: Array<{ code: string }> = await queryRunner.query(
      `SELECT "code" FROM "warehouses"`,
    );
    const taken = new Set(existingCodes.map((r) => r.code));

    for (const location of locations) {
      // Same derivation as LocationsService.generateWarehouseCode.
      const sanitized =
        location.code.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[_-]+/, '') ||
        'LOCATION';
      let code = `LOC-${sanitized}`.slice(0, 45);
      for (let i = 2; taken.has(code); i++) {
        code = `${`LOC-${sanitized}`.slice(0, 45)}-${i}`;
      }
      taken.add(code);

      const [warehouse]: Array<{ id: string }> = await queryRunner.query(
        `INSERT INTO "warehouses" ("code", "name", "description", "location_id")
         VALUES ($1, $2, $3, $4) RETURNING "id"`,
        [
          code,
          `${location.name} Storage`,
          `Storage area of location ${location.code}`,
          location.id,
        ],
      );
      await queryRunner.query(
        `INSERT INTO "zones" ("code", "name", "warehouse_id")
         VALUES ('MAIN', 'Main', $1)`,
        [warehouse.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the auto-created location storage (zones cascade via FK).
    await queryRunner.query(
      `DELETE FROM "warehouses" WHERE "location_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP CONSTRAINT IF EXISTS "FK_warehouses_location"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_warehouses_location"`);
    await queryRunner.query(
      `ALTER TABLE "warehouses" DROP COLUMN IF EXISTS "location_id"`,
    );
  }
}

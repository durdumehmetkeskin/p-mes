import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `delivering` + `delivered` to `stock_items_status_enum` (the warehouse→
 * stage handover states) and the handover audit columns (who delivered/received
 * and when). Enum is recreated (rename→create→cast→drop) because `ALTER TYPE ...
 * ADD VALUE` cannot run inside a transaction.
 */
export class AddStockItemDeliveryStatuses1782910000000 implements MigrationInterface {
  name = 'AddStockItemDeliveryStatuses1782910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasEnum: unknown[] = await queryRunner.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'stock_items_status_enum' AND e.enumlabel = 'delivering'`,
    );
    if (hasEnum.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stock_items" ALTER COLUMN "status" DROP DEFAULT`,
      );
      await queryRunner.query(
        `ALTER TYPE "stock_items_status_enum" RENAME TO "stock_items_status_enum_old"`,
      );
      await queryRunner.query(
        `CREATE TYPE "stock_items_status_enum" AS ENUM('available', 'reserving', 'reserved', 'delivering', 'delivered', 'consumed')`,
      );
      await queryRunner.query(`
        ALTER TABLE "stock_items" ALTER COLUMN "status" TYPE "stock_items_status_enum"
        USING "status"::text::"stock_items_status_enum"
      `);
      await queryRunner.query(
        `ALTER TABLE "stock_items" ALTER COLUMN "status" SET DEFAULT 'available'`,
      );
      await queryRunner.query(`DROP TYPE "stock_items_status_enum_old"`);
    }

    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "delivered_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "received_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stock_items_delivered_by') THEN
        ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_delivered_by" FOREIGN KEY ("delivered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stock_items_received_by') THEN
        ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_received_by" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP CONSTRAINT IF EXISTS "FK_stock_items_delivered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP CONSTRAINT IF EXISTS "FK_stock_items_received_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP COLUMN IF EXISTS "delivered_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP COLUMN IF EXISTS "delivered_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP COLUMN IF EXISTS "received_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP COLUMN IF EXISTS "received_at"`,
    );
    // Fold the new statuses back before shrinking the enum.
    await queryRunner.query(
      `UPDATE "stock_items" SET "status" = 'reserved' WHERE "status" IN ('delivering', 'delivered')`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_items_status_enum" RENAME TO "stock_items_status_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "stock_items_status_enum" AS ENUM('available', 'reserving', 'reserved', 'consumed')`,
    );
    await queryRunner.query(`
      ALTER TABLE "stock_items" ALTER COLUMN "status" TYPE "stock_items_status_enum"
      USING "status"::text::"stock_items_status_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "stock_items" ALTER COLUMN "status" SET DEFAULT 'available'`,
    );
    await queryRunner.query(`DROP TYPE "stock_items_status_enum_new"`);
  }
}

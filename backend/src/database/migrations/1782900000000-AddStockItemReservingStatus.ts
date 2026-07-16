import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add a `reserving` value to `stock_items_status_enum` (available → reserving →
 * reserved). Recreates the enum type (rename → create → cast → drop) because
 * `ALTER TYPE ... ADD VALUE` cannot run inside a transaction. All existing labels
 * are preserved, so the cast is a straight text cast.
 */
export class AddStockItemReservingStatus1782900000000 implements MigrationInterface {
  name = 'AddStockItemReservingStatus1782900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Idempotent: skip if 'reserving' already exists on the enum.
    const exists: unknown[] = await queryRunner.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'stock_items_status_enum' AND e.enumlabel = 'reserving'`,
    );
    if (exists.length > 0) return;

    await queryRunner.query(
      `ALTER TABLE "stock_items" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_items_status_enum" RENAME TO "stock_items_status_enum_old"`,
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
    await queryRunner.query(`DROP TYPE "stock_items_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Fold any `reserving` back to `available` before removing the value.
    await queryRunner.query(
      `UPDATE "stock_items" SET "status" = 'available' WHERE "status" = 'reserving'`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_items_status_enum" RENAME TO "stock_items_status_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "stock_items_status_enum" AS ENUM('available', 'reserved', 'consumed')`,
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

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the stage→warehouse return flow: the `returning` stock status (leftover
 * handed back, pending warehouse re-receipt), the `returned_by`/`returned_at`
 * audit columns, and the `return` inventory-transaction type. The status enum is
 * recreated (rename→create→cast→drop); the transaction-type enum uses
 * `ADD VALUE` (which can't run in a transaction but is safe for this type — see
 * the handover migration precedent).
 */
export class AddStockItemReturnFlow1782930000000 implements MigrationInterface {
  name = 'AddStockItemReturnFlow1782930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasEnum: unknown[] = await queryRunner.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'stock_items_status_enum' AND e.enumlabel = 'returning'`,
    );
    if (hasEnum.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "stock_items" ALTER COLUMN "status" DROP DEFAULT`,
      );
      await queryRunner.query(
        `ALTER TYPE "stock_items_status_enum" RENAME TO "stock_items_status_enum_old"`,
      );
      await queryRunner.query(
        `CREATE TYPE "stock_items_status_enum" AS ENUM('available', 'reserving', 'reserved', 'delivering', 'delivered', 'returning', 'consumed')`,
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
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "returned_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD COLUMN IF NOT EXISTS "returned_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_stock_items_returned_by') THEN
        ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_returned_by" FOREIGN KEY ("returned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;`);

    await queryRunner.query(
      `ALTER TYPE "inventory_transactions_type_enum" ADD VALUE IF NOT EXISTS 'return'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP CONSTRAINT IF EXISTS "FK_stock_items_returned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP COLUMN IF EXISTS "returned_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" DROP COLUMN IF EXISTS "returned_at"`,
    );
    // Fold `returning` back to `delivered` before shrinking the enum.
    await queryRunner.query(
      `UPDATE "stock_items" SET "status" = 'delivered' WHERE "status" = 'returning'`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TYPE "stock_items_status_enum" RENAME TO "stock_items_status_enum_new"`,
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
    await queryRunner.query(`DROP TYPE "stock_items_status_enum_new"`);
    // The 'return' transaction-type value is left in place (enum values can't be
    // dropped without a full type recreate; harmless if unused).
  }
}

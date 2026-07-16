import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the free-text `orders.status` varchar with a derived
 * `order_status_enum` (pending | in_progress | completed). Existing rows are
 * backfilled from their actual process state (mirrors
 * OrdersService.recomputeStatus): completed when the order has processes and
 * all are completed, in_progress when any process is past draft, else pending.
 */
export class OrderStatusEnum1783040000000 implements MigrationInterface {
  name = 'OrderStatusEnum1783040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "orders" o SET "status" = CASE
        WHEN EXISTS (
            SELECT 1 FROM "order_items" oi
            JOIN "processes" p ON p."order_item_id" = oi."id" AND p."deletedAt" IS NULL
            WHERE oi."order_id" = o."id" AND oi."deletedAt" IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM "order_items" oi
            JOIN "processes" p ON p."order_item_id" = oi."id" AND p."deletedAt" IS NULL
            WHERE oi."order_id" = o."id" AND oi."deletedAt" IS NULL
              AND p."overall_status" <> 'completed')
        THEN 'completed'
        WHEN EXISTS (
            SELECT 1 FROM "order_items" oi
            JOIN "processes" p ON p."order_item_id" = oi."id" AND p."deletedAt" IS NULL
            WHERE oi."order_id" = o."id" AND oi."deletedAt" IS NULL
              AND p."overall_status" <> 'draft')
        THEN 'in_progress'
        ELSE 'pending'
      END
    `);
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM('pending', 'in_progress', 'completed')
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
        ALTER COLUMN "status" TYPE "order_status_enum" USING "status"::"order_status_enum",
        ALTER COLUMN "status" SET DEFAULT 'pending',
        ALTER COLUMN "status" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE character varying(50) USING "status"::text,
        ALTER COLUMN "status" DROP NOT NULL
    `);
    await queryRunner.query(`DROP TYPE "order_status_enum"`);
  }
}

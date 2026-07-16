import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the free-text `order_items.status` varchar with the same derived
 * `order_status_enum` the order uses (pending | in_progress | completed).
 * Existing rows are backfilled from the item's own processes (mirrors
 * OrdersService.recomputeItemStatus): completed when the item has processes
 * and all are completed, in_progress when any process is past draft, else
 * pending — any old free-text value is discarded.
 */
export class OrderItemStatusEnum1783200000000 implements MigrationInterface {
  name = 'OrderItemStatusEnum1783200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "order_items" oi SET "status" = CASE
        WHEN EXISTS (
            SELECT 1 FROM "processes" p
            WHERE p."order_item_id" = oi."id" AND p."deletedAt" IS NULL)
          AND NOT EXISTS (
            SELECT 1 FROM "processes" p
            WHERE p."order_item_id" = oi."id" AND p."deletedAt" IS NULL
              AND p."overall_status" <> 'completed')
        THEN 'completed'
        WHEN EXISTS (
            SELECT 1 FROM "processes" p
            WHERE p."order_item_id" = oi."id" AND p."deletedAt" IS NULL
              AND p."overall_status" <> 'draft')
        THEN 'in_progress'
        ELSE 'pending'
      END
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items"
        ALTER COLUMN "status" TYPE "order_status_enum" USING "status"::"order_status_enum",
        ALTER COLUMN "status" SET DEFAULT 'pending',
        ALTER COLUMN "status" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order_items"
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE character varying(50) USING "status"::text,
        ALTER COLUMN "status" DROP NOT NULL
    `);
  }
}

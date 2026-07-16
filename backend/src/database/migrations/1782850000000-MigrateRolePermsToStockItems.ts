import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The Material→Lot→StockItem refactor removed the `reservations:*` and some
 * `inventory-balances:*` permission keys and added `stock-items:*`, but existing
 * roles still carried the old keys (and lacked the new ones) — so non-admin
 * users could open a lot but got 403 on its stock items, and the Roles UI would
 * reject edits containing the removed keys. Map the old reservation permissions
 * onto their stock-item equivalents and drop the removed inventory-balances
 * write keys, for every role.
 */
export class MigrateRolePermsToStockItems1782850000000 implements MigrationInterface {
  name = 'MigrateRolePermsToStockItems1782850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "roles" SET "permissions" = ARRAY(
        SELECT DISTINCT CASE p
          WHEN 'reservations:read' THEN 'stock-items:read'
          WHEN 'reservations:create' THEN 'stock-items:create-reserve'
          WHEN 'reservations:create-fulfill' THEN 'stock-items:create-consume'
          WHEN 'reservations:create-release' THEN 'stock-items:create-release'
          ELSE p
        END
        FROM unnest("permissions") p
        WHERE p NOT IN (
          'inventory-balances:create',
          'inventory-balances:update',
          'inventory-balances:delete'
        )
      )
    `);
    // Inventory-reader roles should also read the (now computed) on-hand view
    // and a project's orders (needed to reserve stock against an order).
    await queryRunner.query(`
      UPDATE "roles" SET "permissions" = (
        SELECT array_agg(DISTINCT k)
        FROM unnest(
          "permissions" || ARRAY['inventory-balances:read', 'orders:read']
        ) k
      )
      WHERE 'materials:read' = ANY("permissions")
        AND NOT (
          'inventory-balances:read' = ANY("permissions")
          AND 'orders:read' = ANY("permissions")
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort reverse of the key remapping (the dropped balances-write keys
    // are not restored).
    await queryRunner.query(`
      UPDATE "roles" SET "permissions" = ARRAY(
        SELECT DISTINCT CASE p
          WHEN 'stock-items:read' THEN 'reservations:read'
          WHEN 'stock-items:create-reserve' THEN 'reservations:create'
          WHEN 'stock-items:create-consume' THEN 'reservations:create-fulfill'
          WHEN 'stock-items:create-release' THEN 'reservations:create-release'
          ELSE p
        END
        FROM unnest("permissions") p
      )
    `);
  }
}

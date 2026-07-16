import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Attribute stock movements to an order/stage so consumption can be summed per
 * stage even after the stock item leaves it (returned → available). Nullable FK
 * columns on inventory_transactions, set on handover/return/consume of
 * stage-bound stock.
 */
export class AddTxStageOrderAttribution1782940000000 implements MigrationInterface {
  name = 'AddTxStageOrderAttribution1782940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "order_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "stage_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inv_tx_order_id" ON "inventory_transactions" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_inv_tx_stage_id" ON "inventory_transactions" ("stage_id")`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_inv_tx_order') THEN
        ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_inv_tx_stage') THEN
        ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_stage" FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id") ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT IF EXISTS "FK_inv_tx_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT IF EXISTS "FK_inv_tx_stage"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_tx_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_inv_tx_stage_id"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "order_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "stage_id"`,
    );
  }
}

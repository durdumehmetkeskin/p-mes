import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add a `handover` inventory-transaction type + the deliverer/receiver audit
 * columns, so a warehouse→stage handover is recorded on the stock ledger.
 */
export class AddHandoverTransaction1782920000000 implements MigrationInterface {
  name = 'AddHandoverTransaction1782920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "inventory_transactions_type_enum" ADD VALUE IF NOT EXISTS 'handover'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "delivered_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "delivered_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "received_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "received_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_inv_tx_delivered_by') THEN
        ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_delivered_by" FOREIGN KEY ("delivered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='FK_inv_tx_received_by') THEN
        ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_inv_tx_received_by" FOREIGN KEY ("received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL;
      END IF;
    END $$;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT IF EXISTS "FK_inv_tx_delivered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT IF EXISTS "FK_inv_tx_received_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "delivered_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "delivered_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "received_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN IF EXISTS "received_at"`,
    );
    // (Enum value 'handover' is left in place — removing an enum value is unsafe.)
  }
}

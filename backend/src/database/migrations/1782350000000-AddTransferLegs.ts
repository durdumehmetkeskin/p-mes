import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the two-leg transfer movement types and a transferGroupId linking the
 * TRANSFER_OUT and TRANSFER_IN records of a single transfer.
 */
export class AddTransferLegs1782350000000 implements MigrationInterface {
  name = 'AddTransferLegs1782350000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PG 12+ allows ADD VALUE inside a transaction as long as the new value is
    // not used in the same transaction (we only alter schema here).
    await queryRunner.query(
      `ALTER TYPE "inventory_transactions_type_enum" ADD VALUE IF NOT EXISTS 'transfer_out'`,
    );
    await queryRunner.query(
      `ALTER TYPE "inventory_transactions_type_enum" ADD VALUE IF NOT EXISTS 'transfer_in'`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD "transfer_group_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_inv_tx_transfer_group" ON "inventory_transactions" ("transfer_group_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_inv_tx_transfer_group"`);
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP COLUMN "transfer_group_id"`,
    );
    // Enum values are intentionally left in place (Postgres cannot drop them
    // without recreating the type).
  }
}

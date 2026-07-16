import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the ADJUSTMENT stock-movement type used by stock counts. */
export class AddAdjustmentType1782370000000 implements MigrationInterface {
  name = 'AddAdjustmentType1782370000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "inventory_transactions_type_enum" ADD VALUE IF NOT EXISTS 'adjustment'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot drop an enum value without recreating the type; leave it.
  }
}

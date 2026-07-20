import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Material-style handover for products: `handover_status`
 * (produced → delivering → received) plus who delivered/received and when.
 * Existing rows stay `produced`.
 */
export class ProductHandover1783240000000 implements MigrationInterface {
  name = 'ProductHandover1783240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "product_handover_status_enum"
      AS ENUM('produced', 'delivering', 'received')
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "handover_status" "product_handover_status_enum" NOT NULL DEFAULT 'produced',
        ADD COLUMN "delivered_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        ADD COLUMN "delivered_at" timestamptz,
        ADD COLUMN "received_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        ADD COLUMN "received_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "handover_status",
        DROP COLUMN IF EXISTS "delivered_by_user_id",
        DROP COLUMN IF EXISTS "delivered_at",
        DROP COLUMN IF EXISTS "received_by_user_id",
        DROP COLUMN IF EXISTS "received_at"
    `);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "product_handover_status_enum"`,
    );
  }
}

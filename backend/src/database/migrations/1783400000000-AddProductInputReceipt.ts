import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * INPUT custody for products: when a product is consumed as another stage's
 * input, a worker of that stage picks it up (QR scan). Separate from the
 * storage drop-off fields the product may already carry.
 */
export class AddProductInputReceipt1783400000000 implements MigrationInterface {
  name = 'AddProductInputReceipt1783400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "products" ADD COLUMN "input_received_by_user_id" uuid`,
    );
    await q(
      `ALTER TABLE "products" ADD COLUMN "input_received_at" timestamptz`,
    );
    await q(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_input_received_by" FOREIGN KEY ("input_received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_input_received_by"`,
    );
    await q(`ALTER TABLE "products" DROP COLUMN "input_received_at"`);
    await q(`ALTER TABLE "products" DROP COLUMN "input_received_by_user_id"`);
  }
}

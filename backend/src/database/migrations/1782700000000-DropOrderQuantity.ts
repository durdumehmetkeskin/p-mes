import { MigrationInterface, QueryRunner } from 'typeorm';

/** Drop the (unused) quantity column from orders and order_items. */
export class DropOrderQuantity1782700000000 implements MigrationInterface {
  name = 'DropOrderQuantity1782700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "quantity"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "quantity"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD COLUMN "quantity" numeric(14,3)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "quantity" numeric(14,3)`,
    );
  }
}

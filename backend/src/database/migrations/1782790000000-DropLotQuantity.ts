import { MigrationInterface, QueryRunner } from 'typeorm';

/** Drop lots.quantity — a lot's stock is now the SUM of its stock items. */
export class DropLotQuantity1782790000000 implements MigrationInterface {
  name = 'DropLotQuantity1782790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "quantity"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lots" ADD COLUMN "quantity" numeric(14,3) NOT NULL DEFAULT '0'`,
    );
  }
}

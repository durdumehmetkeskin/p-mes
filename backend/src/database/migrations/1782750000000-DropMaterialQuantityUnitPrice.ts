import { MigrationInterface, QueryRunner } from 'typeorm';

/** Drop the quantity and unit_price columns from materials (unused). */
export class DropMaterialQuantityUnitPrice1782750000000 implements MigrationInterface {
  name = 'DropMaterialQuantityUnitPrice1782750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "quantity"`);
    await queryRunner.query(`ALTER TABLE "materials" DROP COLUMN "unit_price"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" ADD COLUMN "unit_price" numeric(14,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD COLUMN "quantity" numeric(14,3) NOT NULL DEFAULT '0'`,
    );
  }
}

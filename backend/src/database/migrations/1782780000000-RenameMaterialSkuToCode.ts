import { MigrationInterface, QueryRunner } from 'typeorm';

/** Rename materials.sku -> materials.code (product code); keep it unique. */
export class RenameMaterialSkuToCode1782780000000 implements MigrationInterface {
  name = 'RenameMaterialSkuToCode1782780000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" RENAME COLUMN "sku" TO "code"`,
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_materials_sku" RENAME TO "IDX_materials_code"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER INDEX "IDX_materials_code" RENAME TO "IDX_materials_sku"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" RENAME COLUMN "code" TO "sku"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reorder level moved off the material (global) onto ProjectMaterialRequirement
 * (per-project). Drop the now-unused global column.
 */
export class DropMaterialReorderLevel1782890000000 implements MigrationInterface {
  name = 'DropMaterialReorderLevel1782890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN IF EXISTS "reorder_level"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "reorder_level" numeric(14,3) NOT NULL DEFAULT '0'`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Order material requirements switch from a reorder threshold to a required
 * quantity: the order states how much it needs and stock gets reserved
 * against it. Same column shape (numeric 14,3), so a rename suffices.
 */
export class RequirementRequiredQuantity1783000000000 implements MigrationInterface {
  name = 'RequirementRequiredQuantity1783000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_material_requirements" RENAME COLUMN "reorder_level" TO "required_quantity"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_material_requirements" RENAME COLUMN "required_quantity" TO "reorder_level"`,
    );
  }
}

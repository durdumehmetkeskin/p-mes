import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-material expiry-urgency thresholds (in whole weeks). Drive the derived
 * expiry-health status on the material's lots.
 */
export class AddMaterialCriticalWeeks1782860000000 implements MigrationInterface {
  name = 'AddMaterialCriticalWeeks1782860000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // IF NOT EXISTS: idempotent if the columns were pre-applied out of band.
    await queryRunner.query(
      `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "danger_weeks" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "warning_weeks" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN IF EXISTS "warning_weeks"`,
    );
    await queryRunner.query(
      `ALTER TABLE "materials" DROP COLUMN IF EXISTS "danger_weeks"`,
    );
  }
}

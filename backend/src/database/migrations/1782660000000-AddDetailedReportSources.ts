import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the four detailed report data-source values
 * (project-report / order-report / location-report / personnel-report) to the
 * report data-source enum so the new business-grade report templates can be
 * seeded. Postgres enum values can't be dropped, so down() is a no-op.
 */
export class AddDetailedReportSources1782660000000 implements MigrationInterface {
  name = 'AddDetailedReportSources1782660000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "report_data_source_enum" ADD VALUE IF NOT EXISTS 'project-report'`,
    );
    await queryRunner.query(
      `ALTER TYPE "report_data_source_enum" ADD VALUE IF NOT EXISTS 'order-report'`,
    );
    await queryRunner.query(
      `ALTER TYPE "report_data_source_enum" ADD VALUE IF NOT EXISTS 'location-report'`,
    );
    await queryRunner.query(
      `ALTER TYPE "report_data_source_enum" ADD VALUE IF NOT EXISTS 'personnel-report'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres does not support removing values from an enum type.
  }
}

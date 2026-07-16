import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the `location-status` value to the report data-source enum so the new
 * "location detailed status" report template can be seeded. Postgres enum
 * values can't be dropped, so down() is a no-op.
 */
export class AddLocationStatusReportSource1782650000000 implements MigrationInterface {
  name = 'AddLocationStatusReportSource1782650000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "report_data_source_enum" ADD VALUE IF NOT EXISTS 'location-status'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres does not support removing values from an enum type.
  }
}

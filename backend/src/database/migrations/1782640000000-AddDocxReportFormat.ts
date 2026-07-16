import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds Word (.docx) output to the reporting module: a new recipe
 * (html-embedded-in-docx) and a new output format (docx). Postgres enum values
 * can't be dropped, so down() is a no-op.
 */
export class AddDocxReportFormat1782640000000 implements MigrationInterface {
  name = 'AddDocxReportFormat1782640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TYPE "report_recipe_enum" ADD VALUE IF NOT EXISTS 'html-embedded-in-docx'`,
    );
    await q(`ALTER TYPE "report_format_enum" ADD VALUE IF NOT EXISTS 'docx'`);
  }

  public async down(): Promise<void> {
    // Postgres does not support removing values from an enum type.
  }
}

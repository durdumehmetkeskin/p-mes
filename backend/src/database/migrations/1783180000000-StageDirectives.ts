import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Free-text work directives on process stages. Written only by the stage's
 * responsible user or an admin (enforced in the service); readable by every
 * project member with stage read access.
 */
export class StageDirectives1783180000000 implements MigrationInterface {
  name = 'StageDirectives1783180000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "process_stages" ADD COLUMN IF NOT EXISTS "directives" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "process_stages" DROP COLUMN IF EXISTS "directives"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drag & drop for process stages on the DAG canvas: persisted node positions
 * (null = dagre auto-layout). Seeded from the template stage at clone time.
 */
export class ProcessStagePositions1783140000000 implements MigrationInterface {
  name = 'ProcessStagePositions1783140000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "process_stages" ADD COLUMN IF NOT EXISTS "pos_x" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "process_stages" ADD COLUMN IF NOT EXISTS "pos_y" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "process_stages" DROP COLUMN IF EXISTS "pos_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "process_stages" DROP COLUMN IF EXISTS "pos_x"`,
    );
  }
}

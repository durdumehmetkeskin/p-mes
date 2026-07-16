import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage workers: a stage keeps its single responsible user but may have many
 * workers (çalışanlar). Workers see the stage on their Kanban board and count
 * into the per-user workload/personnel views.
 */
export class ProcessStageWorkers1783150000000 implements MigrationInterface {
  name = 'ProcessStageWorkers1783150000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "process_stage_workers" (
        "stage_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_process_stage_workers" PRIMARY KEY ("stage_id", "user_id")
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_process_stage_workers_user" ON "process_stage_workers" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "process_stage_workers" ADD CONSTRAINT "FK_process_stage_workers_stage" FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "process_stage_workers" ADD CONSTRAINT "FK_process_stage_workers_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "process_stage_workers"`);
  }
}

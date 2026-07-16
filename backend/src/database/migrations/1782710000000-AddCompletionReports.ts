import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Completion reports (stored forms) for process stages and processes. One per
 * stage / per process (1:1), filed once the work is completed.
 */
export class AddCompletionReports1782710000000 implements MigrationInterface {
  name = 'AddCompletionReports1782710000000';

  private readonly base = `
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // --- stage_completion_reports ---
    await q(`
      CREATE TABLE "stage_completion_reports" (${this.base}
        "stage_id" uuid NOT NULL,
        "summary" text NOT NULL,
        "outcome" character varying(100),
        "reported_by_user_id" uuid,
        CONSTRAINT "PK_stage_completion_reports_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_stage_completion_reports_stage" ON "stage_completion_reports" ("stage_id") WHERE "deletedAt" IS NULL`,
    );
    await q(
      `CREATE INDEX "IDX_stage_completion_reports_user" ON "stage_completion_reports" ("reported_by_user_id")`,
    );
    await q(
      `ALTER TABLE "stage_completion_reports" ADD CONSTRAINT "FK_stage_completion_reports_stage" FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "stage_completion_reports" ADD CONSTRAINT "FK_stage_completion_reports_user" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // --- process_completion_reports ---
    await q(`
      CREATE TABLE "process_completion_reports" (${this.base}
        "process_id" uuid NOT NULL,
        "summary" text NOT NULL,
        "outcome" character varying(100),
        "reported_by_user_id" uuid,
        CONSTRAINT "PK_process_completion_reports_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_process_completion_reports_process" ON "process_completion_reports" ("process_id") WHERE "deletedAt" IS NULL`,
    );
    await q(
      `CREATE INDEX "IDX_process_completion_reports_user" ON "process_completion_reports" ("reported_by_user_id")`,
    );
    await q(
      `ALTER TABLE "process_completion_reports" ADD CONSTRAINT "FK_process_completion_reports_process" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "process_completion_reports" ADD CONSTRAINT "FK_process_completion_reports_user" FOREIGN KEY ("reported_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "process_completion_reports"`);
    await queryRunner.query(`DROP TABLE "stage_completion_reports"`);
  }
}

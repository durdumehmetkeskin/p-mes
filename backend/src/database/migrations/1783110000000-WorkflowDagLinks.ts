import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Node-based (DAG) workflows: stages become nodes; dependency edges say "from
 * must complete before to can start"; stages with no path between them run in
 * parallel. Two edge tables (template + runtime), canvas positions on template
 * stages, and a chain-edge backfill (seq i -> i+1) so every existing linear
 * template/process keeps exactly its old gating behavior. `sequence` remains
 * as a derived topological display order.
 */
export class WorkflowDagLinks1783110000000 implements MigrationInterface {
  name = 'WorkflowDagLinks1783110000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workflow_template_stage_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "from_stage_id" uuid NOT NULL,
        "to_stage_id" uuid NOT NULL,
        CONSTRAINT "PK_workflow_template_stage_links_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_wts_link_pair" UNIQUE ("from_stage_id", "to_stage_id"),
        CONSTRAINT "CHK_wts_link_no_self" CHECK ("from_stage_id" <> "to_stage_id"),
        CONSTRAINT "FK_wts_link_from"
          FOREIGN KEY ("from_stage_id") REFERENCES "workflow_template_stages"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_wts_link_to"
          FOREIGN KEY ("to_stage_id") REFERENCES "workflow_template_stages"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wts_link_from" ON "workflow_template_stage_links" ("from_stage_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_wts_link_to" ON "workflow_template_stage_links" ("to_stage_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "process_stage_links" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "from_stage_id" uuid NOT NULL,
        "to_stage_id" uuid NOT NULL,
        CONSTRAINT "PK_process_stage_links_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ps_link_pair" UNIQUE ("from_stage_id", "to_stage_id"),
        CONSTRAINT "CHK_ps_link_no_self" CHECK ("from_stage_id" <> "to_stage_id"),
        CONSTRAINT "FK_ps_link_from"
          FOREIGN KEY ("from_stage_id") REFERENCES "process_stages"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_ps_link_to"
          FOREIGN KEY ("to_stage_id") REFERENCES "process_stages"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ps_link_from" ON "process_stage_links" ("from_stage_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ps_link_to" ON "process_stage_links" ("to_stage_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "workflow_template_stages" ADD COLUMN IF NOT EXISTS "pos_x" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stages" ADD COLUMN IF NOT EXISTS "pos_y" double precision`,
    );

    // Backfill: every existing linear template/process gets chain edges
    // (seq i -> i+1) so DAG gating reproduces the old prefix rule exactly.
    await queryRunner.query(`
      INSERT INTO "workflow_template_stage_links" ("from_stage_id", "to_stage_id")
      SELECT prev_id, id FROM (
        SELECT id,
               LAG(id) OVER (
                 PARTITION BY template_id ORDER BY sequence, "createdAt"
               ) AS prev_id
        FROM "workflow_template_stages"
        WHERE "deletedAt" IS NULL
      ) t
      WHERE prev_id IS NOT NULL
      ON CONFLICT ("from_stage_id", "to_stage_id") DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO "process_stage_links" ("from_stage_id", "to_stage_id")
      SELECT prev_id, id FROM (
        SELECT id,
               LAG(id) OVER (
                 PARTITION BY process_id ORDER BY sequence, "createdAt"
               ) AS prev_id
        FROM "process_stages"
        WHERE "deletedAt" IS NULL
      ) t
      WHERE prev_id IS NOT NULL
      ON CONFLICT ("from_stage_id", "to_stage_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "process_stage_links"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "workflow_template_stage_links"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stages" DROP COLUMN IF EXISTS "pos_y"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stages" DROP COLUMN IF EXISTS "pos_x"`,
    );
  }
}

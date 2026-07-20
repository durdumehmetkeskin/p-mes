import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two user-drawable arrow kinds on the workflow canvases:
 * - 'sequence' — execution-order dependency (the original arrows)
 * - 'io'       — "from's OUTPUT feeds to's INPUT" (drawn between IO ports)
 * Both kinds gate stage start. A pair of stages may carry both kinds, so the
 * unique constraint widens from (from,to) to (from,to,kind) under the same
 * constraint name (keeps the entity @Unique stable).
 */
export class LinkKinds1783130000000 implements MigrationInterface {
  name = 'LinkKinds1783130000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stage_links"
       ADD COLUMN IF NOT EXISTS "kind" character varying(20) NOT NULL DEFAULT 'sequence'`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_wts_link_kind'
        ) THEN
          ALTER TABLE "workflow_template_stage_links"
          ADD CONSTRAINT "CHK_wts_link_kind" CHECK ("kind" IN ('sequence', 'io'));
        END IF;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stage_links" DROP CONSTRAINT IF EXISTS "UQ_wts_link_pair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_template_stage_links"
       ADD CONSTRAINT "UQ_wts_link_pair" UNIQUE ("from_stage_id", "to_stage_id", "kind")`,
    );

    await queryRunner.query(
      `ALTER TABLE "process_stage_links"
       ADD COLUMN IF NOT EXISTS "kind" character varying(20) NOT NULL DEFAULT 'sequence'`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CHK_ps_link_kind'
        ) THEN
          ALTER TABLE "process_stage_links"
          ADD CONSTRAINT "CHK_ps_link_kind" CHECK ("kind" IN ('sequence', 'io'));
        END IF;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "process_stage_links" DROP CONSTRAINT IF EXISTS "UQ_ps_link_pair"`,
    );
    await queryRunner.query(
      `ALTER TABLE "process_stage_links"
       ADD CONSTRAINT "UQ_ps_link_pair" UNIQUE ("from_stage_id", "to_stage_id", "kind")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // io rows would violate the restored 2-column unique — drop them first.
    await queryRunner.query(
      `DELETE FROM "process_stage_links" WHERE "kind" <> 'sequence'`,
    );
    await queryRunner.query(
      `DELETE FROM "workflow_template_stage_links" WHERE "kind" <> 'sequence'`,
    );
    for (const [table, uq, chk] of [
      ['process_stage_links', 'UQ_ps_link_pair', 'CHK_ps_link_kind'],
      [
        'workflow_template_stage_links',
        'UQ_wts_link_pair',
        'CHK_wts_link_kind',
      ],
    ] as const) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${uq}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}"
         ADD CONSTRAINT "${uq}" UNIQUE ("from_stage_id", "to_stage_id")`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${chk}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "kind"`,
      );
    }
  }
}

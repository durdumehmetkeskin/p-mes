import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the optional `section_reservations.stage_id` link: reservations made
 * from the stage dialog remember their stage so the UI can find and prefill
 * them. Existing reservations stay stage-less (no backfill).
 */
export class SectionReservationStage1783060000000 implements MigrationInterface {
  name = 'SectionReservationStage1783060000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "section_reservations" ADD "stage_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_section_reservations_stage_id" ON "section_reservations" ("stage_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "section_reservations"
      ADD CONSTRAINT "FK_section_reservations_stage"
      FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "section_reservations" DROP CONSTRAINT "FK_section_reservations_stage"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_section_reservations_stage_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "section_reservations" DROP COLUMN "stage_id"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stage types keep only the generic behaviour: the detailType concept and its
 * per-type detail tables are removed entirely (all tables were empty). Also
 * removes the now-dead detail-line permission keys from every role.
 */
export class GenericOnlyStageTypes1783190000000 implements MigrationInterface {
  name = 'GenericOnlyStageTypes1783190000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'bom_lines',
      'material_requirement_lines',
      'purchase_requests',
      'operations',
      'resource_assignments',
      'capacity_records',
      'calendar_records',
      'quality_control_points',
      'sub_work_steps',
      'operation_cards',
      'operation_documents',
    ]) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    await queryRunner.query(
      `ALTER TABLE "stage_types" DROP COLUMN IF EXISTS "detail_type"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "stage_detail_type_enum"`);
    for (const key of [
      'process-stages:create-details',
      'process-stages:update-details',
      'process-stages:delete-details',
    ]) {
      await queryRunner.query(
        `UPDATE "roles" SET "permissions" = array_remove("permissions", $1)`,
        [key],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Data-destructive removal (tables were empty); only the column comes back.
    await queryRunner.query(
      `CREATE TYPE "stage_detail_type_enum" AS ENUM ('generic','bom','mrp','purchasing','routing','operation_plan','resource','capacity','calendar','quality','work_order','operation_card','document')`,
    );
    await queryRunner.query(
      `ALTER TABLE "stage_types" ADD COLUMN IF NOT EXISTS "detail_type" "stage_detail_type_enum" NOT NULL DEFAULT 'generic'`,
    );
  }
}

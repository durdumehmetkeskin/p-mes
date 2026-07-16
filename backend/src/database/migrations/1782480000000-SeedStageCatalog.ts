import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the stage-type catalog (one type per detailType, in both categories
 * where relevant) and two system-default workflow templates (planning &
 * production) with ordered stages. Templates are deletable/editable; runtime
 * processes copy them independently.
 */
export class SeedStageCatalog1782480000000 implements MigrationInterface {
  name = 'SeedStageCatalog1782480000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // --- stage-type catalog ---
    await q(`
      INSERT INTO "stage_types" ("code","name","category","detail_type","default_input","default_output") VALUES
        ('BOM','Bill of Materials','planning','bom','Product spec','BOM'),
        ('MRP','Material Requirements','planning','mrp','BOM','Requirements'),
        ('PURCHASING','Purchasing','planning','purchasing','Requirements','Purchase requests'),
        ('ROUTING','Routing','planning','routing','BOM','Operations'),
        ('OPERATION_PLAN','Operation Plan','planning','operation_plan','Routing','Operation plan'),
        ('RESOURCE','Resource Planning','planning','resource','Operations','Resource assignments'),
        ('CAPACITY','Capacity Planning','planning','capacity','Resources','Capacity'),
        ('CALENDAR','Scheduling','planning','calendar','Capacity','Schedule'),
        ('GENERIC_PLAN','Generic Planning','planning','generic',NULL,NULL),
        ('WORK_ORDER','Work Order','production','work_order','Operation plan','Work orders'),
        ('OPERATION_CARD','Operation Card','production','operation_card','Work order','Operation cards'),
        ('QUALITY','Quality Control','production','quality','Operation','Quality results'),
        ('DOCUMENT','Documentation','production','document',NULL,'Documents'),
        ('GENERIC_PROD','Generic Production','production','generic',NULL,NULL)
    `);

    // --- default planning template ---
    const planning: Array<{ id: string }> = await q(`
      INSERT INTO "workflow_templates" ("name","description","category","is_system_default")
      VALUES ('Default Planning Workflow','Standard planning stages','planning',true)
      RETURNING "id"
    `);
    const planningId = planning[0].id;
    await this.seedStages(q, planningId, [
      'BOM',
      'MRP',
      'PURCHASING',
      'ROUTING',
      'CAPACITY',
    ]);

    // --- default production template ---
    const production: Array<{ id: string }> = await q(`
      INSERT INTO "workflow_templates" ("name","description","category","is_system_default")
      VALUES ('Default Production Workflow','Standard production stages','production',true)
      RETURNING "id"
    `);
    const productionId = production[0].id;
    await this.seedStages(q, productionId, [
      'WORK_ORDER',
      'OPERATION_CARD',
      'QUALITY',
    ]);
  }

  private async seedStages(
    q: (sql: string) => Promise<unknown>,
    templateId: string,
    stageCodes: string[],
  ): Promise<void> {
    let sequence = 1;
    for (const code of stageCodes) {
      await q(`
        INSERT INTO "workflow_template_stages" ("template_id","stage_type_id","sequence")
        SELECT '${templateId}', st."id", ${sequence}
        FROM "stage_types" st WHERE st."code" = '${code}'
      `);
      sequence += 1;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`DELETE FROM "workflow_template_stages"`);
    await q(
      `DELETE FROM "workflow_templates" WHERE "is_system_default" = true`,
    );
    await q(`DELETE FROM "stage_types"`);
  }
}

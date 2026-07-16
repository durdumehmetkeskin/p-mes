import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the two placeholder default templates with the real system defaults:
 * a 13-stage planning workflow ("Standart Üretim Planlama") and a 6-stage
 * production workflow ("Standart Üretim"). Each template stage references a
 * stage type (by code, for its detail type) and overrides the display name.
 * Templates are copied independently into runtime processes, so editing them
 * later never affects existing orders.
 */
export class SeedDefaultWorkflowTemplates1782490000000 implements MigrationInterface {
  name = 'SeedDefaultWorkflowTemplates1782490000000';

  // [stageTypeCode, displayName] in order.
  private readonly planningStages: Array<[string, string]> = [
    ['GENERIC_PLAN', 'İş Paketi'],
    ['DOCUMENT', 'Teknik Doküman Doğrulama'],
    ['BOM', 'BOM'],
    ['MRP', 'MRP'],
    ['PURCHASING', 'Satın Alma & Depo'],
    ['ROUTING', 'Operasyon Rotası'],
    ['OPERATION_PLAN', 'Operasyon Süresi/İş Kırılımı'],
    ['RESOURCE', 'Kaynak Planlama'],
    ['CAPACITY', 'Kapasite Planlama'],
    ['CALENDAR', 'Üretim Takvimi'],
    ['QUALITY', 'Kalite Kontrol Planı'],
    ['WORK_ORDER', 'İş Emri Oluşturma'],
    ['GENERIC_PLAN', 'Üretim Serbest Bırakma'],
  ];

  private readonly productionStages: Array<[string, string]> = [
    ['GENERIC_PROD', 'İş Emrini Aç'],
    ['OPERATION_PLAN', 'Operasyon Planı'],
    ['OPERATION_CARD', 'Operasyon Bilgileri'],
    ['DOCUMENT', 'Teknik Doküman'],
    ['GENERIC_PROD', 'Yayınla'],
    ['GENERIC_PROD', 'Üretimi Başlat'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string, params?: unknown[]) =>
      queryRunner.query(sql, params);

    // Drop the previous placeholder defaults (FK cascades to their stages).
    await q(
      `DELETE FROM "workflow_templates" WHERE "name" IN ('Default Planning Workflow','Default Production Workflow')`,
    );

    await this.seedTemplate(
      q,
      'Standart Üretim Planlama',
      'Standart üretim planlama akışı',
      'planning',
      this.planningStages,
    );
    await this.seedTemplate(
      q,
      'Standart Üretim',
      'Standart üretim akışı',
      'production',
      this.productionStages,
    );
  }

  private async seedTemplate(
    q: (sql: string, params?: unknown[]) => Promise<any>,
    name: string,
    description: string,
    category: string,
    stages: Array<[string, string]>,
  ): Promise<void> {
    const rows: Array<{ id: string }> = await q(
      `INSERT INTO "workflow_templates" ("name","description","category","is_system_default")
       VALUES ($1,$2,$3,true) RETURNING "id"`,
      [name, description, category],
    );
    const templateId = rows[0].id;

    let sequence = 1;
    for (const [code, stageName] of stages) {
      await q(
        `INSERT INTO "workflow_template_stages" ("template_id","stage_type_id","sequence","name")
         SELECT $1, st."id", $2, $3 FROM "stage_types" st WHERE st."code" = $4`,
        [templateId, sequence, stageName, code],
      );
      sequence += 1;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    // Remove the new defaults (FK cascade removes their stages).
    await q(
      `DELETE FROM "workflow_templates" WHERE "name" IN ('Standart Üretim Planlama','Standart Üretim')`,
    );
    // Restore the previous placeholder defaults (without stages).
    await q(
      `INSERT INTO "workflow_templates" ("name","description","category","is_system_default")
       VALUES ('Default Planning Workflow','Standard planning stages','planning',true),
              ('Default Production Workflow','Standard production stages','production',true)`,
    );
  }
}

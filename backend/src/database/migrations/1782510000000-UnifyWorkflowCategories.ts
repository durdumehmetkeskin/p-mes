import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Unifies categories: workflow_templates.category and processes.category move
 * from the planning/production enum to a FK on the same stage_type_categories
 * catalog used by stage types. A template may only contain stage types of its
 * own category, so the default templates are rebuilt to be compliant — adding
 * planning-category variants (document/quality/work_order) and a
 * production-category operation_plan so no template mixes categories.
 */
export class UnifyWorkflowCategories1782510000000 implements MigrationInterface {
  name = 'UnifyWorkflowCategories1782510000000';

  private readonly planningStages: Array<[string, string]> = [
    ['GENERIC_PLAN', 'İş Paketi'],
    ['DOCUMENT_PLAN', 'Teknik Doküman Doğrulama'],
    ['BOM', 'BOM'],
    ['MRP', 'MRP'],
    ['PURCHASING', 'Satın Alma & Depo'],
    ['ROUTING', 'Operasyon Rotası'],
    ['OPERATION_PLAN', 'Operasyon Süresi/İş Kırılımı'],
    ['RESOURCE', 'Kaynak Planlama'],
    ['CAPACITY', 'Kapasite Planlama'],
    ['CALENDAR', 'Üretim Takvimi'],
    ['QUALITY_PLAN', 'Kalite Kontrol Planı'],
    ['WORK_ORDER_PLAN', 'İş Emri Oluşturma'],
    ['GENERIC_PLAN', 'Üretim Serbest Bırakma'],
  ];

  private readonly productionStages: Array<[string, string]> = [
    ['GENERIC_PROD', 'İş Emrini Aç'],
    ['OPERATION_PLAN_PROD', 'Operasyon Planı'],
    ['OPERATION_CARD', 'Operasyon Bilgileri'],
    ['DOCUMENT', 'Teknik Doküman'],
    ['GENERIC_PROD', 'Yayınla'],
    ['GENERIC_PROD', 'Üretimi Başlat'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // --- workflow_templates.category enum -> FK ---
    await q(`ALTER TABLE "workflow_templates" ADD COLUMN "category_id" uuid`);
    await q(`
      UPDATE "workflow_templates" t SET "category_id" = c."id"
      FROM "stage_type_categories" c WHERE c."code" = t."category"::text`);
    await q(
      `ALTER TABLE "workflow_templates" ALTER COLUMN "category_id" SET NOT NULL`,
    );
    await q(`ALTER TABLE "workflow_templates" DROP COLUMN "category"`);
    await q(
      `CREATE INDEX "IDX_workflow_templates_category" ON "workflow_templates" ("category_id")`,
    );
    await q(
      `ALTER TABLE "workflow_templates" ADD CONSTRAINT "FK_workflow_templates_category" FOREIGN KEY ("category_id") REFERENCES "stage_type_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // --- processes.category enum -> FK ---
    await q(`ALTER TABLE "processes" ADD COLUMN "category_id" uuid`);
    await q(`
      UPDATE "processes" p SET "category_id" = c."id"
      FROM "stage_type_categories" c WHERE c."code" = p."category"::text`);
    await q(`ALTER TABLE "processes" ALTER COLUMN "category_id" SET NOT NULL`);
    await q(`ALTER TABLE "processes" DROP COLUMN "category"`);
    await q(
      `CREATE INDEX "IDX_processes_category" ON "processes" ("category_id")`,
    );
    await q(
      `ALTER TABLE "processes" ADD CONSTRAINT "FK_processes_category" FOREIGN KEY ("category_id") REFERENCES "stage_type_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // --- compliant stage-type variants ---
    const newTypes: Array<[string, string, string, string]> = [
      ['DOCUMENT_PLAN', 'Document (planning)', 'planning', 'document'],
      ['QUALITY_PLAN', 'Quality (planning)', 'planning', 'quality'],
      ['WORK_ORDER_PLAN', 'Work order (planning)', 'planning', 'work_order'],
      [
        'OPERATION_PLAN_PROD',
        'Operation plan (production)',
        'production',
        'operation_plan',
      ],
    ];
    for (const [code, name, catCode, detail] of newTypes) {
      await q(`
        INSERT INTO "stage_types" ("code","name","category_id","detail_type")
        SELECT '${code}','${name}', c."id", '${detail}'
        FROM "stage_type_categories" c WHERE c."code" = '${catCode}'`);
    }

    // --- rebuild the default templates so they are category-compliant ---
    await q(
      `DELETE FROM "workflow_templates" WHERE "name" IN ('Standart Üretim Planlama','Standart Üretim')`,
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
    q: (sql: string) => Promise<any>,
    name: string,
    description: string,
    categoryCode: string,
    stages: Array<[string, string]>,
  ): Promise<void> {
    const rows: Array<{ id: string }> = await q(`
      INSERT INTO "workflow_templates" ("name","description","category_id","is_system_default")
      SELECT '${name}','${description}', c."id", true
      FROM "stage_type_categories" c WHERE c."code" = '${categoryCode}'
      RETURNING "id"`);
    const templateId = rows[0].id;
    let sequence = 1;
    for (const [code, stageName] of stages) {
      await q(`
        INSERT INTO "workflow_template_stages" ("template_id","stage_type_id","sequence","name")
        SELECT '${templateId}', st."id", ${sequence}, '${stageName}'
        FROM "stage_types" st WHERE st."code" = '${code}'`);
      sequence += 1;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    for (const table of ['processes', 'workflow_templates']) {
      await q(
        `ALTER TABLE "${table}" ADD COLUMN "category" "stage_category_enum"`,
      );
      await q(`
        UPDATE "${table}" t
        SET "category" = (CASE WHEN c."code" IN ('planning','production')
                               THEN c."code" ELSE 'planning' END)::"stage_category_enum"
        FROM "stage_type_categories" c WHERE c."id" = t."category_id"`);
      await q(`ALTER TABLE "${table}" ALTER COLUMN "category" SET NOT NULL`);
    }
    await q(`ALTER TABLE "processes" DROP CONSTRAINT "FK_processes_category"`);
    await q(`DROP INDEX "IDX_processes_category"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "category_id"`);
    await q(
      `ALTER TABLE "workflow_templates" DROP CONSTRAINT "FK_workflow_templates_category"`,
    );
    await q(`DROP INDEX "IDX_workflow_templates_category"`);
    await q(`ALTER TABLE "workflow_templates" DROP COLUMN "category_id"`);
    await q(
      `DELETE FROM "stage_types" WHERE "code" IN ('DOCUMENT_PLAN','QUALITY_PLAN','WORK_ORDER_PLAN','OPERATION_PLAN_PROD')`,
    );
  }
}

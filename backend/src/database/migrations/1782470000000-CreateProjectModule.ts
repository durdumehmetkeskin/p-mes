import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Project module data model: core entities (employees, customer companies,
 * contacts, projects, orders), the configurable workflow stage infrastructure
 * (stage_types catalog, workflow_templates + stages, processes + stages), and
 * the per-detailType detail tables. All tables have UUID PK, created/updated/
 * deleted timestamps (soft delete) and appropriate FK cascades.
 */
export class CreateProjectModule1782470000000 implements MigrationInterface {
  name = 'CreateProjectModule1782470000000';

  // Standard BaseEntity columns prefixed to every table body.
  private readonly base = `
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // --- enum types (shared) ---
    await q(
      `CREATE TYPE "stage_category_enum" AS ENUM('planning', 'production')`,
    );
    await q(
      `CREATE TYPE "stage_detail_type_enum" AS ENUM('generic','bom','mrp','purchasing','routing','operation_plan','resource','capacity','calendar','quality','work_order','operation_card','document')`,
    );
    await q(
      `CREATE TYPE "process_status_enum" AS ENUM('draft','in_progress','completed')`,
    );
    await q(
      `CREATE TYPE "process_stage_status_enum" AS ENUM('pending','in_progress','completed')`,
    );

    // --- core entities ---
    await q(`
      CREATE TABLE "employees" (${this.base}
        "code" character varying(50) NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "email" character varying(255),
        "phone" character varying(50),
        "title" character varying(100),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_employees_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_employees_code" ON "employees" ("code") WHERE "deletedAt" IS NULL`,
    );

    await q(`
      CREATE TABLE "customer_companies" (${this.base}
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "tax_number" character varying(50),
        "email" character varying(255),
        "phone" character varying(50),
        "address" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_customer_companies_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_customer_companies_code" ON "customer_companies" ("code") WHERE "deletedAt" IS NULL`,
    );

    await q(`
      CREATE TABLE "contact_persons" (${this.base}
        "customer_company_id" uuid NOT NULL,
        "first_name" character varying(100) NOT NULL,
        "last_name" character varying(100) NOT NULL,
        "email" character varying(255),
        "phone" character varying(50),
        "role" character varying(100),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_contact_persons_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_contact_persons_company" ON "contact_persons" ("customer_company_id")`,
    );
    await q(
      `ALTER TABLE "contact_persons" ADD CONSTRAINT "FK_contact_persons_company" FOREIGN KEY ("customer_company_id") REFERENCES "customer_companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "projects" (${this.base}
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "manager_id" uuid,
        "customer_company_id" uuid,
        "contact_person_id" uuid,
        "start_date" date,
        "end_date" date,
        "status" character varying(50),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_projects_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_projects_code" ON "projects" ("code") WHERE "deletedAt" IS NULL`,
    );
    await q(`CREATE INDEX "IDX_projects_manager" ON "projects" ("manager_id")`);
    await q(
      `CREATE INDEX "IDX_projects_company" ON "projects" ("customer_company_id")`,
    );
    await q(
      `CREATE INDEX "IDX_projects_contact" ON "projects" ("contact_person_id")`,
    );
    await q(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_manager" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_company" FOREIGN KEY ("customer_company_id") REFERENCES "customer_companies"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "projects" ADD CONSTRAINT "FK_projects_contact" FOREIGN KEY ("contact_person_id") REFERENCES "contact_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "orders" (${this.base}
        "project_id" uuid NOT NULL,
        "order_number" character varying(50) NOT NULL,
        "name" character varying(255),
        "description" character varying(1000),
        "quantity" numeric(14,3),
        "due_date" date,
        "status" character varying(50),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_orders_number" ON "orders" ("order_number") WHERE "deletedAt" IS NULL`,
    );
    await q(`CREATE INDEX "IDX_orders_project" ON "orders" ("project_id")`);
    await q(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_orders_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // --- configurable stage infrastructure ---
    await q(`
      CREATE TABLE "stage_types" (${this.base}
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "category" "stage_category_enum" NOT NULL,
        "default_input" character varying(255),
        "default_output" character varying(255),
        "detail_type" "stage_detail_type_enum" NOT NULL DEFAULT 'generic',
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_stage_types_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_stage_types_code" ON "stage_types" ("code") WHERE "deletedAt" IS NULL`,
    );

    await q(`
      CREATE TABLE "workflow_templates" (${this.base}
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "category" "stage_category_enum" NOT NULL,
        "is_system_default" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_workflow_templates_id" PRIMARY KEY ("id")
      )`);

    await q(`
      CREATE TABLE "workflow_template_stages" (${this.base}
        "template_id" uuid NOT NULL,
        "stage_type_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "name" character varying(255),
        "input" character varying(255),
        "output" character varying(255),
        CONSTRAINT "PK_workflow_template_stages_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_wts_template" ON "workflow_template_stages" ("template_id")`,
    );
    await q(
      `CREATE INDEX "IDX_wts_stage_type" ON "workflow_template_stages" ("stage_type_id")`,
    );
    await q(
      `ALTER TABLE "workflow_template_stages" ADD CONSTRAINT "FK_wts_template" FOREIGN KEY ("template_id") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "workflow_template_stages" ADD CONSTRAINT "FK_wts_stage_type" FOREIGN KEY ("stage_type_id") REFERENCES "stage_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "processes" (${this.base}
        "order_id" uuid NOT NULL,
        "category" "stage_category_enum" NOT NULL,
        "used_template_id" uuid,
        "overall_status" "process_status_enum" NOT NULL DEFAULT 'draft',
        CONSTRAINT "PK_processes_id" PRIMARY KEY ("id")
      )`);
    await q(`CREATE INDEX "IDX_processes_order" ON "processes" ("order_id")`);
    await q(
      `CREATE INDEX "IDX_processes_template" ON "processes" ("used_template_id")`,
    );
    await q(
      `ALTER TABLE "processes" ADD CONSTRAINT "FK_processes_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "processes" ADD CONSTRAINT "FK_processes_template" FOREIGN KEY ("used_template_id") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "process_stages" (${this.base}
        "process_id" uuid NOT NULL,
        "stage_type_id" uuid,
        "sequence" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "input" character varying(255),
        "output" character varying(255),
        "status" "process_stage_status_enum" NOT NULL DEFAULT 'pending',
        "responsible_employee_id" uuid,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "note" character varying(1000),
        CONSTRAINT "PK_process_stages_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_process_stages_process" ON "process_stages" ("process_id")`,
    );
    await q(
      `CREATE INDEX "IDX_process_stages_stage_type" ON "process_stages" ("stage_type_id")`,
    );
    await q(
      `CREATE INDEX "IDX_process_stages_employee" ON "process_stages" ("responsible_employee_id")`,
    );
    await q(
      `ALTER TABLE "process_stages" ADD CONSTRAINT "FK_process_stages_process" FOREIGN KEY ("process_id") REFERENCES "processes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "process_stages" ADD CONSTRAINT "FK_process_stages_stage_type" FOREIGN KEY ("stage_type_id") REFERENCES "stage_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "process_stages" ADD CONSTRAINT "FK_process_stages_employee" FOREIGN KEY ("responsible_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // --- detail tables (each → process_stages, CASCADE) ---
    await q(`
      CREATE TABLE "bom_lines" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "item_code" character varying(100),
        "item_name" character varying(255) NOT NULL,
        "quantity" numeric(14,3),
        "unit" character varying(20),
        "level" integer NOT NULL DEFAULT 0,
        "note" character varying(500),
        CONSTRAINT "PK_bom_lines_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "material_requirement_lines" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "item_code" character varying(100),
        "item_name" character varying(255) NOT NULL,
        "required_quantity" numeric(14,3) NOT NULL,
        "unit" character varying(20),
        "required_date" date,
        "available_quantity" numeric(14,3),
        "shortage_quantity" numeric(14,3),
        "note" character varying(500),
        CONSTRAINT "PK_material_requirement_lines_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "purchase_requests" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "item_code" character varying(100),
        "item_name" character varying(255) NOT NULL,
        "quantity" numeric(14,3) NOT NULL,
        "unit" character varying(20),
        "needed_date" date,
        "supplier" character varying(255),
        "status" character varying(50),
        "note" character varying(500),
        CONSTRAINT "PK_purchase_requests_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "operations" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "code" character varying(50),
        "name" character varying(255) NOT NULL,
        "work_center" character varying(100),
        "setup_minutes" integer,
        "run_minutes" integer,
        "note" character varying(500),
        CONSTRAINT "PK_operations_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "sub_work_steps" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(500),
        "estimated_minutes" integer,
        "note" character varying(500),
        CONSTRAINT "PK_sub_work_steps_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "resource_assignments" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "resource_name" character varying(255) NOT NULL,
        "resource_type" character varying(50),
        "quantity" numeric(14,3),
        "unit" character varying(20),
        "note" character varying(500),
        CONSTRAINT "PK_resource_assignments_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "capacity_records" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "work_center" character varying(100) NOT NULL,
        "period_start" date NOT NULL,
        "period_end" date,
        "capacity_hours" numeric(14,2) NOT NULL,
        "load_hours" numeric(14,2),
        "note" character varying(500),
        CONSTRAINT "PK_capacity_records_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "calendar_records" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_date" TIMESTAMP WITH TIME ZONE,
        "kind" character varying(50),
        "note" character varying(500),
        CONSTRAINT "PK_calendar_records_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "quality_control_points" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "code" character varying(50),
        "name" character varying(255) NOT NULL,
        "characteristic" character varying(255),
        "specification" character varying(255),
        "method" character varying(100),
        "note" character varying(500),
        CONSTRAINT "PK_quality_control_points_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "operation_cards" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "operation_name" character varying(255) NOT NULL,
        "instructions" character varying(2000),
        "machine" character varying(100),
        "note" character varying(500),
        CONSTRAINT "PK_operation_cards_id" PRIMARY KEY ("id")
      )`);
    await q(`
      CREATE TABLE "operation_documents" (${this.base}
        "process_stage_id" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "document_type" character varying(50),
        "url" character varying(1000),
        "note" character varying(500),
        CONSTRAINT "PK_operation_documents_id" PRIMARY KEY ("id")
      )`);

    // FK + index for every detail table (all reference process_stages).
    const detailTables = [
      'bom_lines',
      'material_requirement_lines',
      'purchase_requests',
      'operations',
      'sub_work_steps',
      'resource_assignments',
      'capacity_records',
      'calendar_records',
      'quality_control_points',
      'operation_cards',
      'operation_documents',
    ];
    for (const table of detailTables) {
      await q(
        `CREATE INDEX "IDX_${table}_stage" ON "${table}" ("process_stage_id")`,
      );
      await q(
        `ALTER TABLE "${table}" ADD CONSTRAINT "FK_${table}_stage" FOREIGN KEY ("process_stage_id") REFERENCES "process_stages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    const tables = [
      'operation_documents',
      'operation_cards',
      'quality_control_points',
      'calendar_records',
      'capacity_records',
      'resource_assignments',
      'sub_work_steps',
      'operations',
      'purchase_requests',
      'material_requirement_lines',
      'bom_lines',
      'process_stages',
      'processes',
      'workflow_template_stages',
      'workflow_templates',
      'stage_types',
      'orders',
      'projects',
      'contact_persons',
      'customer_companies',
      'employees',
    ];
    for (const t of tables) {
      await q(`DROP TABLE IF EXISTS "${t}"`);
    }
    await q(`DROP TYPE IF EXISTS "process_stage_status_enum"`);
    await q(`DROP TYPE IF EXISTS "process_status_enum"`);
    await q(`DROP TYPE IF EXISTS "stage_detail_type_enum"`);
    await q(`DROP TYPE IF EXISTS "stage_category_enum"`);
  }
}

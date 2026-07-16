import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extract the customer/contact tables into a standalone `customers` module.
 *
 * Renames tables `customer_companies` -> `customers` and `contact_persons` ->
 * `contacts`, the contacts FK column `customer_company_id` -> `customer_id`,
 * and tidies the associated constraint/index names. The `projects` table keeps
 * its `customer_company_id` / `contact_person_id` columns; Postgres preserves
 * their foreign keys automatically across the table rename.
 *
 * Also remaps the granted permission keys stored on `roles.permissions`
 * (customer-companies:* / contact-persons:* -> customers:* / contacts:*).
 */
export class RenameCustomersModule1782670000000 implements MigrationInterface {
  name = 'RenameCustomersModule1782670000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // --- rename tables ---
    await q(`ALTER TABLE "customer_companies" RENAME TO "customers"`);
    await q(`ALTER TABLE "contact_persons" RENAME TO "contacts"`);

    // --- rename contacts FK column ---
    await q(
      `ALTER TABLE "contacts" RENAME COLUMN "customer_company_id" TO "customer_id"`,
    );

    // --- tidy constraint / index names (non-functional) ---
    await q(
      `ALTER TABLE "customers" RENAME CONSTRAINT "PK_customer_companies_id" TO "PK_customers_id"`,
    );
    await q(
      `ALTER INDEX "UQ_customer_companies_code" RENAME TO "UQ_customers_code"`,
    );
    await q(
      `ALTER TABLE "contacts" RENAME CONSTRAINT "PK_contact_persons_id" TO "PK_contacts_id"`,
    );
    await q(
      `ALTER TABLE "contacts" RENAME CONSTRAINT "FK_contact_persons_company" TO "FK_contacts_customer"`,
    );
    await q(
      `ALTER INDEX "IDX_contact_persons_company" RENAME TO "IDX_contacts_customer"`,
    );

    // --- remap granted permission keys on roles ---
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'customer-companies:read', 'customers:read')`,
    );
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'customer-companies:create', 'customers:create')`,
    );
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'contact-persons:read', 'contacts:read')`,
    );
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'contact-persons:create', 'contacts:create')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // --- revert permission key remap ---
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'customers:read', 'customer-companies:read')`,
    );
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'customers:create', 'customer-companies:create')`,
    );
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'contacts:read', 'contact-persons:read')`,
    );
    await q(
      `UPDATE "roles" SET "permissions" = array_replace("permissions", 'contacts:create', 'contact-persons:create')`,
    );

    // --- revert constraint / index names ---
    await q(
      `ALTER INDEX "IDX_contacts_customer" RENAME TO "IDX_contact_persons_company"`,
    );
    await q(
      `ALTER TABLE "contacts" RENAME CONSTRAINT "FK_contacts_customer" TO "FK_contact_persons_company"`,
    );
    await q(
      `ALTER TABLE "contacts" RENAME CONSTRAINT "PK_contacts_id" TO "PK_contact_persons_id"`,
    );
    await q(
      `ALTER INDEX "UQ_customers_code" RENAME TO "UQ_customer_companies_code"`,
    );
    await q(
      `ALTER TABLE "customers" RENAME CONSTRAINT "PK_customers_id" TO "PK_customer_companies_id"`,
    );

    // --- revert contacts FK column ---
    await q(
      `ALTER TABLE "contacts" RENAME COLUMN "customer_id" TO "customer_company_id"`,
    );

    // --- revert table renames ---
    await q(`ALTER TABLE "contacts" RENAME TO "contact_persons"`);
    await q(`ALTER TABLE "customers" RENAME TO "customer_companies"`);
  }
}

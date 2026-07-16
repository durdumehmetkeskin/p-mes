import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Project contacts: maps a subset of the customer's contacts to a project
 * (many-to-many), so a project's contacts are the ones explicitly attached to
 * it rather than the customer's entire contact list.
 */
export class AddProjectContacts1782680000000 implements MigrationInterface {
  name = 'AddProjectContacts1782680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_contacts" (
        "project_id" uuid NOT NULL,
        "contact_id" uuid NOT NULL,
        CONSTRAINT "PK_project_contacts" PRIMARY KEY ("project_id", "contact_id")
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_project_contacts_contact" ON "project_contacts" ("contact_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contacts" ADD CONSTRAINT "FK_project_contacts_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_contacts" ADD CONSTRAINT "FK_project_contacts_contact" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_contacts"`);
  }
}

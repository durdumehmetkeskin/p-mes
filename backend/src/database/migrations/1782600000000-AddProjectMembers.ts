import { MigrationInterface, QueryRunner } from 'typeorm';

/** Project team: maps users assigned to a project (visibility + assignment). */
export class AddProjectMembers1782600000000 implements MigrationInterface {
  name = 'AddProjectMembers1782600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "project_members" (
        "project_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_project_members" PRIMARY KEY ("project_id", "user_id")
      )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_project_members_user" ON "project_members" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_project_members_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_members" ADD CONSTRAINT "FK_project_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "project_members"`);
  }
}

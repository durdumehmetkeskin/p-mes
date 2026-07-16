import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional project a zone is dedicated to (project stock stays in its zones). */
export class AddZoneProject1782830000000 implements MigrationInterface {
  name = 'AddZoneProject1782830000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "zones" ADD COLUMN "project_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_zones_project" ON "zones" ("project_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ADD CONSTRAINT "FK_zones_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "zones" DROP CONSTRAINT "FK_zones_project"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_zones_project"`);
    await queryRunner.query(`ALTER TABLE "zones" DROP COLUMN "project_id"`);
  }
}

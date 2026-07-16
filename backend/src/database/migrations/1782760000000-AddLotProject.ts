import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional project on lots — a lot can be allocated to a project, and a project
 * can have many lots. SET NULL on project delete.
 */
export class AddLotProject1782760000000 implements MigrationInterface {
  name = 'AddLotProject1782760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lots" ADD COLUMN "project_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_lots_project" ON "lots" ("project_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD CONSTRAINT "FK_lots_project" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lots" DROP CONSTRAINT "FK_lots_project"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_lots_project"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "project_id"`);
  }
}

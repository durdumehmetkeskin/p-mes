import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the free-text `location` column on tools with a real link to the
 * inventory location system: a nullable `location_id` FK (Warehouse → Location),
 * SET NULL when the location is removed.
 */
export class AddToolLocation1782400000000 implements MigrationInterface {
  name = 'AddToolLocation1782400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tools" DROP COLUMN "location"`);
    await queryRunner.query(`ALTER TABLE "tools" ADD "location_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_tools_location_id" ON "tools" ("location_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "tools"
      ADD CONSTRAINT "FK_tools_location"
      FOREIGN KEY ("location_id") REFERENCES "locations"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tools" DROP CONSTRAINT "FK_tools_location"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_tools_location_id"`);
    await queryRunner.query(`ALTER TABLE "tools" DROP COLUMN "location_id"`);
    await queryRunner.query(
      `ALTER TABLE "tools" ADD "location" character varying(255)`,
    );
  }
}

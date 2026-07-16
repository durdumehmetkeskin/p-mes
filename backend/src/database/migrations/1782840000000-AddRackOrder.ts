import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional order a rack is dedicated to (within its zone's project). */
export class AddRackOrder1782840000000 implements MigrationInterface {
  name = 'AddRackOrder1782840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "racks" ADD COLUMN "order_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_racks_order" ON "racks" ("order_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "racks" ADD CONSTRAINT "FK_racks_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "racks" DROP CONSTRAINT "FK_racks_order"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_racks_order"`);
    await queryRunner.query(`ALTER TABLE "racks" DROP COLUMN "order_id"`);
  }
}

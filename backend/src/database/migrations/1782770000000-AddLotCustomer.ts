import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional customer on lots — a lot can be associated with a customer, and its
 * project is then chosen from that customer's projects. SET NULL on delete.
 */
export class AddLotCustomer1782770000000 implements MigrationInterface {
  name = 'AddLotCustomer1782770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lots" ADD COLUMN "customer_id" uuid`);
    await queryRunner.query(
      `CREATE INDEX "IDX_lots_customer" ON "lots" ("customer_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "lots" ADD CONSTRAINT "FK_lots_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lots" DROP CONSTRAINT "FK_lots_customer"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_lots_customer"`);
    await queryRunner.query(`ALTER TABLE "lots" DROP COLUMN "customer_id"`);
  }
}

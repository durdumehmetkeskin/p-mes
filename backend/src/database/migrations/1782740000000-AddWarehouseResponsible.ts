import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional responsible user for a warehouse. */
export class AddWarehouseResponsible1782740000000 implements MigrationInterface {
  name = 'AddWarehouseResponsible1782740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`ALTER TABLE "warehouses" ADD COLUMN "responsible_user_id" uuid`);
    await q(
      `CREATE INDEX "IDX_warehouses_responsible" ON "warehouses" ("responsible_user_id")`,
    );
    await q(
      `ALTER TABLE "warehouses" ADD CONSTRAINT "FK_warehouses_responsible" FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(
      `ALTER TABLE "warehouses" DROP CONSTRAINT "FK_warehouses_responsible"`,
    );
    await q(`DROP INDEX "IDX_warehouses_responsible"`);
    await q(`ALTER TABLE "warehouses" DROP COLUMN "responsible_user_id"`);
  }
}

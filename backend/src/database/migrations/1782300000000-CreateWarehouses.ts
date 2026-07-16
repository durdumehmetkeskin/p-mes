import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouses1782300000000 implements MigrationInterface {
  name = 'CreateWarehouses1782300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE "warehouses" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "address" character varying(500),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_warehouses_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_warehouses_code" ON "warehouses" ("code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "warehouses"`);
  }
}

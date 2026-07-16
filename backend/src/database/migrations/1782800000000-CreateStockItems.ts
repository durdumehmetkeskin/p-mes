import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Stock items — the single source of on-hand stock under a lot at a location
 * (warehouse/rack) with a status (available/reserved/consumed) and, when
 * reserved, an order (+ optional stage).
 */
export class CreateStockItems1782800000000 implements MigrationInterface {
  name = 'CreateStockItems1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."stock_items_status_enum" AS ENUM('available', 'reserved', 'consumed')`,
    );
    await queryRunner.query(`
      CREATE TABLE "stock_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "lot_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "rack_id" uuid,
        "quantity" numeric(14,3) NOT NULL DEFAULT '0',
        "status" "public"."stock_items_status_enum" NOT NULL DEFAULT 'available',
        "order_id" uuid,
        "stage_id" uuid,
        "note" character varying(500),
        CONSTRAINT "PK_stock_items_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_items_lot" ON "stock_items" ("lot_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_items_warehouse" ON "stock_items" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_items_rack" ON "stock_items" ("rack_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_items_status" ON "stock_items" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_items_order" ON "stock_items" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_stock_items_stage" ON "stock_items" ("stage_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_lot" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_warehouse" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_rack" FOREIGN KEY ("rack_id") REFERENCES "racks"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_items" ADD CONSTRAINT "FK_stock_items_stage" FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stock_items"`);
    await queryRunner.query(`DROP TYPE "public"."stock_items_status_enum"`);
  }
}

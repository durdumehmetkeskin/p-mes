import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Insert an OrderItem (line item) level between Orders and Processes:
 * `Order → OrderItem → Process`. Non-destructive — every existing order gets a
 * single default item, and each existing process is repointed from its order to
 * that order's default item.
 */
export class AddOrderItems1782690000000 implements MigrationInterface {
  name = 'AddOrderItems1782690000000';

  private readonly base = `
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // 1. order_items table
    await q(`
      CREATE TABLE "order_items" (${this.base}
        "order_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "quantity" numeric(14,3),
        "status" character varying(50),
        CONSTRAINT "PK_order_items_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_order_items_order" ON "order_items" ("order_id")`,
    );
    await q(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 2. Seed one default item per existing order (carries the order's name/qty).
    await q(`
      INSERT INTO "order_items" ("id", "createdAt", "updatedAt", "order_id", "sequence", "name", "quantity")
      SELECT uuid_generate_v4(), now(), now(), o."id", 1, COALESCE(o."name", 'Item 1'), o."quantity"
      FROM "orders" o`);

    // 3. Reparent processes: order_id -> order_item_id (backfill via default item).
    await q(`ALTER TABLE "processes" ADD COLUMN "order_item_id" uuid`);
    await q(`
      UPDATE "processes" p
      SET "order_item_id" = li."id"
      FROM "order_items" li
      WHERE li."order_id" = p."order_id"`);
    await q(
      `ALTER TABLE "processes" ALTER COLUMN "order_item_id" SET NOT NULL`,
    );
    await q(
      `CREATE INDEX "IDX_processes_order_item" ON "processes" ("order_item_id")`,
    );
    await q(
      `ALTER TABLE "processes" ADD CONSTRAINT "FK_processes_order_item" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // 4. Drop the old direct order coupling.
    await q(`ALTER TABLE "processes" DROP CONSTRAINT "FK_processes_order"`);
    await q(`DROP INDEX "IDX_processes_order"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "order_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);

    // Restore processes.order_id from the item's order.
    await q(`ALTER TABLE "processes" ADD COLUMN "order_id" uuid`);
    await q(`
      UPDATE "processes" p
      SET "order_id" = li."order_id"
      FROM "order_items" li
      WHERE li."id" = p."order_item_id"`);
    await q(`ALTER TABLE "processes" ALTER COLUMN "order_id" SET NOT NULL`);
    await q(`CREATE INDEX "IDX_processes_order" ON "processes" ("order_id")`);
    await q(
      `ALTER TABLE "processes" ADD CONSTRAINT "FK_processes_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Drop the order_item coupling + table.
    await q(
      `ALTER TABLE "processes" DROP CONSTRAINT "FK_processes_order_item"`,
    );
    await q(`DROP INDEX "IDX_processes_order_item"`);
    await q(`ALTER TABLE "processes" DROP COLUMN "order_item_id"`);
    await q(`DROP TABLE "order_items"`);
  }
}

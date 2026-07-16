import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Production-output records: the `products` table (one row per produced
 * intermediate product / finished product / mold / ...) and its dynamic
 * `product_types` classification lookup. Products are NOT stock — they never
 * touch Material/Lot/StockItem; warehouse/rack are informational only. All
 * origin FKs are SET NULL so a product record survives deletion of the
 * order/process/stage it came from.
 */
export class CreateProducts1783070000000 implements MigrationInterface {
  name = 'CreateProducts1783070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "product_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_product_types_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_product_types_name" ON "product_types" ("name")`,
    );

    // Seed common starter types (users can edit/delete these).
    await queryRunner.query(`
      INSERT INTO "product_types" ("name", "description") VALUES
        ('Intermediate Product', 'Semi-finished output used in later stages'),
        ('Finished Product', 'Completed end product'),
        ('Mold', 'Manufactured mold (production output, not a tooling asset)')
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "product_type_id" uuid,
        "quantity" numeric(14,3) NOT NULL,
        "material_unit_id" uuid,
        "order_id" uuid,
        "process_id" uuid,
        "stage_id" uuid,
        "warehouse_id" uuid,
        "rack_id" uuid,
        "produced_at" TIMESTAMP WITH TIME ZONE,
        "produced_by_user_id" uuid,
        "note" character varying(1000),
        CONSTRAINT "PK_products_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_products_code" ON "products" ("code")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_product_type_id" ON "products" ("product_type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_material_unit_id" ON "products" ("material_unit_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_order_id" ON "products" ("order_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_process_id" ON "products" ("process_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_stage_id" ON "products" ("stage_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_warehouse_id" ON "products" ("warehouse_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_rack_id" ON "products" ("rack_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_products_produced_by_user_id" ON "products" ("produced_by_user_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_product_type"
      FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_material_unit"
      FOREIGN KEY ("material_unit_id") REFERENCES "material_units"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_process"
      FOREIGN KEY ("process_id") REFERENCES "processes"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_stage"
      FOREIGN KEY ("stage_id") REFERENCES "process_stages"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_warehouse"
      FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_rack"
      FOREIGN KEY ("rack_id") REFERENCES "racks"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "products"
      ADD CONSTRAINT "FK_products_produced_by_user"
      FOREIGN KEY ("produced_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TABLE "product_types"`);
  }
}

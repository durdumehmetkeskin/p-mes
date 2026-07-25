import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * The per-user custody ("zimmet") ledger — one row per custody lifecycle
 * (opened at receive, closed at return/consume/release) with snapshot display
 * fields so history survives deletion of the source rows. NO BACKFILL is
 * possible: pre-existing custody data was destroyed on close-out by design,
 * so history starts at this deployment (current holdings still show — they
 * are read live from the operational tables).
 */
export class AddCustodyRecords1784996360421 implements MigrationInterface {
    name = 'AddCustodyRecords1784996360421'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."custody_records_item_type_enum" AS ENUM('stock_item', 'tool', 'product')`);
        await queryRunner.query(`CREATE TYPE "public"."custody_records_close_action_enum" AS ENUM('returned', 'consumed', 'released')`);
        await queryRunner.query(`CREATE TABLE "custody_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "item_type" "public"."custody_records_item_type_enum" NOT NULL, "source_id" uuid NOT NULL, "user_id" uuid, "stage_id" uuid, "item_code" character varying(100) NOT NULL, "item_name" character varying(255) NOT NULL, "lot_number" character varying(100), "unit" character varying(50), "quantity" numeric(14,3), "order_number" character varying(100), "stage_name" character varying(255), "warehouse_code" character varying(100), "received_at" TIMESTAMP WITH TIME ZONE NOT NULL, "returning_at" TIMESTAMP WITH TIME ZONE, "closed_at" TIMESTAMP WITH TIME ZONE, "close_action" "public"."custody_records_close_action_enum", "returned_quantity" numeric(14,3), "used_quantity" numeric(14,3), CONSTRAINT "PK_0b9af812008b38c8eaa60ca0f00" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_85c7c311ed6642e57e805080f7" ON "custody_records"  ("item_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_98f9c37b10021e0b898d00ddd7" ON "custody_records"  ("source_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_cddca9ed9cbf0f50120e39a85c" ON "custody_records"  ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_3fb9a0ee6faca23d7aa8c4a437" ON "custody_records"  ("stage_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_2e49b321074344a4ed8d8f10bc" ON "custody_records"  ("item_type", "source_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_4f637a24f6f21f50576ee55303" ON "custody_records"  ("user_id", "closed_at") `);
        await queryRunner.query(`ALTER TABLE "custody_records" ADD CONSTRAINT "FK_cddca9ed9cbf0f50120e39a85c9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custody_records" DROP CONSTRAINT "FK_cddca9ed9cbf0f50120e39a85c9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4f637a24f6f21f50576ee55303"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2e49b321074344a4ed8d8f10bc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3fb9a0ee6faca23d7aa8c4a437"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cddca9ed9cbf0f50120e39a85c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98f9c37b10021e0b898d00ddd7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_85c7c311ed6642e57e805080f7"`);
        await queryRunner.query(`DROP TABLE "custody_records"`);
        await queryRunner.query(`DROP TYPE "public"."custody_records_close_action_enum"`);
        await queryRunner.query(`DROP TYPE "public"."custody_records_item_type_enum"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Product journey: snapshot the ORIGINAL producing stage's name so it survives
 * the flow-through re-stamps (a consuming stage's completion makes the product
 * that stage's output). Backfill is valid here because stage_id is still
 * always the producer when this runs — the flow-through code ships with this
 * migration. (The FK rename is generator churn: same FK, TypeORM hash name.)
 */
export class AddProductJourney1785041244729 implements MigrationInterface {
    name = 'AddProductJourney1785041244729'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_products_input_received_by"`);
        await queryRunner.query(`ALTER TABLE "products" ADD "origin_stage_name" character varying(255)`);
        await queryRunner.query(
            `UPDATE "products" p SET "origin_stage_name" = s."name"
             FROM "process_stages" s WHERE p."stage_id" = s."id"`,
        );
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_35ffe283b9f5a74f4042ef73f97" FOREIGN KEY ("input_received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_35ffe283b9f5a74f4042ef73f97"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "origin_stage_name"`);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_products_input_received_by" FOREIGN KEY ("input_received_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}

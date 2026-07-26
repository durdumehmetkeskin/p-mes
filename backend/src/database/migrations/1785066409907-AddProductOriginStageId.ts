import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Id snapshot of the ORIGINAL producing stage (no FK — survives stage
 * deletion) so the journey's "produced" event can resolve that stage's run
 * window + section reservation even after flow-through re-stamps. Backfill
 * from stage_id: exact for never-flowed products, best-effort (= last
 * processed stage) for any that already flowed through.
 */
export class AddProductOriginStageId1785066409907 implements MigrationInterface {
    name = 'AddProductOriginStageId1785066409907'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "origin_stage_id" uuid`);
        await queryRunner.query(
            `UPDATE "products" SET "origin_stage_id" = "stage_id" WHERE "stage_id" IS NOT NULL`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "origin_stage_id"`);
    }

}

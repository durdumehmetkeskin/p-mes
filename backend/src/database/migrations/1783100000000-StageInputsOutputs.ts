import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Structured stage inputs/outputs: a stage can take/produce products,
 * documents, or both.
 * - Input products: products.consumed_by_stage_id (the stage that used the
 *   product as input; products.stage_id remains the stage that produced it).
 * - Input/output documents: new attachment owner types 'stage_input' /
 *   'stage_output' (stored in MinIO like every attachment; ownerId = stage id).
 * - Grants products:consume to the default `user` role so stage responsibles
 *   can link inputs out of the box.
 */
export class StageInputsOutputs1783100000000 implements MigrationInterface {
  name = 'StageInputsOutputs1783100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "consumed_by_stage_id" uuid`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_products_consumed_by_stage_id"
       ON "products" ("consumed_by_stage_id")`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_products_consumed_by_stage'
        ) THEN
          ALTER TABLE "products"
          ADD CONSTRAINT "FK_products_consumed_by_stage"
          FOREIGN KEY ("consumed_by_stage_id") REFERENCES "process_stages"("id")
          ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$
    `);

    // New attachment owner types (PG 12+ allows ADD VALUE in a transaction as
    // long as the new value isn't used in the same transaction).
    await queryRunner.query(
      `ALTER TYPE "attachment_owner_type_enum" ADD VALUE IF NOT EXISTS 'stage_input'`,
    );
    await queryRunner.query(
      `ALTER TYPE "attachment_owner_type_enum" ADD VALUE IF NOT EXISTS 'stage_output'`,
    );

    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [['products:consume']],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )
       WHERE "name" = 'user'`,
      [['products:consume']],
    );
    // PG enum values cannot be dropped; stage_input/stage_output rows are
    // removed so the values simply go unused.
    await queryRunner.query(
      `DELETE FROM "attachments" WHERE "owner_type" IN ('stage_input', 'stage_output')`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "FK_products_consumed_by_stage"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_products_consumed_by_stage_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "consumed_by_stage_id"`,
    );
  }
}

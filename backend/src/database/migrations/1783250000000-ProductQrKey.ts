import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * One PERSISTENT QR per product: the PNG is generated once (at creation, or
 * lazily on first request for pre-existing rows), stored in MinIO, and its
 * object key recorded here — every later request serves the SAME image.
 */
export class ProductQrKey1783250000000 implements MigrationInterface {
  name = 'ProductQrKey1783250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" ADD COLUMN "qr_object_key" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP COLUMN IF EXISTS "qr_object_key"`,
    );
  }
}

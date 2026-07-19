import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * File attachments on order items: new attachment owner type 'order_item'
 * (ownerId = OrderItem id; stored in MinIO like every attachment,
 * membership-scoped like project/process docs).
 */
export class OrderItemAttachments1783280000000 implements MigrationInterface {
  name = 'OrderItemAttachments1783280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PG 12+ allows ADD VALUE in a transaction as long as the new value isn't
    // used in the same transaction (precedent: StageInputsOutputs).
    await queryRunner.query(
      `ALTER TYPE "attachment_owner_type_enum" ADD VALUE IF NOT EXISTS 'order_item'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PG enum values cannot be dropped; remove the rows so the value goes unused.
    await queryRunner.query(
      `DELETE FROM "attachments" WHERE "owner_type" = 'order_item'`,
    );
  }
}

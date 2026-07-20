import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Project members must be able to VIEW the project's customer and contacts
 * (the workspace Customer/Contacts tabs read /customers/:id and /contacts) —
 * the default `user` role was missing the read keys, so members got 403s.
 * Editing stays locked: create/update/delete keys are NOT granted, and the
 * project-level customer/contact mutations are manager/admin-only in the
 * service layer.
 */
export class GrantCustomerReadToUserRole1783310000000 implements MigrationInterface {
  name = 'GrantCustomerReadToUserRole1783310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [['customers:read', 'contacts:read']],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )
       WHERE "name" = 'user'`,
      [['customers:read', 'contacts:read']],
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The project's customer & contact sections are readable only by admins and
 * the project's manager. Reverts GrantCustomerReadToUserRole: the global
 * customers:read / contacts:read keys are removed from the default `user`
 * role again — the workspace now serves the manager via project-scoped
 * routes (/projects/:id/customer, /customer-options, /contacts) that are
 * relationship-authorized in the service instead of key-gated.
 */
export class CustomerReadManagerOnly1783320000000 implements MigrationInterface {
  name = 'CustomerReadManagerOnly1783320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )
       WHERE "name" = 'user'`,
      [['customers:read', 'contacts:read']],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [['customers:read', 'contacts:read']],
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grant the default `user` role the read permissions needed to view everything
 * about a project one is a member of. The data itself stays membership-scoped in
 * the services (non-members get 404/empty), so these keys simply let membership
 * become the effective read gate. Idempotent union — never clobbers any extra
 * permissions an admin may have added to the role.
 */
export class GrantMemberReadToUserRole1782980000000 implements MigrationInterface {
  name = 'GrantMemberReadToUserRole1782980000000';

  private static readonly KEYS = [
    'projects:read',
    'orders:read',
    'order-items:read',
    'processes:read',
    'process-stages:read',
    'attachments:read',
    'stage-types:read',
    'stage-type-categories:read',
    'workflow-templates:read',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const keys = GrantMemberReadToUserRole1782980000000.KEYS;
    // Union the keys into the role's permissions, de-duplicated.
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [keys],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const keys = GrantMemberReadToUserRole1782980000000.KEYS;
    // Remove exactly the keys this migration added.
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )
       WHERE "name" = 'user'`,
      [keys],
    );
  }
}

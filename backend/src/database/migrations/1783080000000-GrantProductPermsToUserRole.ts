import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Grant the default `user` role read + create on products and product types,
 * so members can record what a stage produced right from the stage-completion
 * flow (and add missing types inline) without an admin grant. Reads stay
 * membership-scoped in the service; update/delete remain admin-granted.
 * Idempotent union — never clobbers extra permissions an admin added.
 */
export class GrantProductPermsToUserRole1783080000000 implements MigrationInterface {
  name = 'GrantProductPermsToUserRole1783080000000';

  private static readonly KEYS = [
    'products:read',
    'products:create',
    'product-types:read',
    'product-types:create',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const keys = GrantProductPermsToUserRole1783080000000.KEYS;
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
    const keys = GrantProductPermsToUserRole1783080000000.KEYS;
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

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A process responsible (plain `user` role) must be able to reserve tools for
 * their stages — the reserve picker and the stage's reserved-tools panel read
 * tools:read-guarded data (GET /tools, /process-stages/:id/tool-reservations,
 * /tools/:id/reservations). Grant tools:read to the default role; write keys
 * are NOT granted (the tool area stays read-only for plain users).
 */
export class GrantToolReadToUserRole1783340000000 implements MigrationInterface {
  name = 'GrantToolReadToUserRole1783340000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [['tools:read']],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )
       WHERE "name" = 'user'`,
      [['tools:read']],
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Locations must be VISIBLE to every user: the default `user` role gains the
 * read keys of the whole locations area (list/detail, sections + their
 * reservation schedule, storage racks, sensor data). Write keys are NOT
 * granted — the area stays read-only for plain members.
 */
export class GrantLocationReadToUserRole1783330000000
  implements MigrationInterface
{
  name = 'GrantLocationReadToUserRole1783330000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [
        [
          'locations:read',
          'sections:read',
          'section-reservations:read',
          'storage-racks:read',
          'location-data:read',
        ],
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )
       WHERE "name" = 'user'`,
      [
        [
          'locations:read',
          'sections:read',
          'section-reservations:read',
          'storage-racks:read',
          'location-data:read',
        ],
      ],
    );
  }
}

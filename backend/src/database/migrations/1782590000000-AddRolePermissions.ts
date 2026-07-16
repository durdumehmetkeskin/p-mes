import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds a permissions array to roles for per-role permission management. */
export class AddRolePermissions1782590000000 implements MigrationInterface {
  name = 'AddRolePermissions1782590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "permissions" text[] NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "roles" DROP COLUMN IF EXISTS "permissions"`,
    );
  }
}

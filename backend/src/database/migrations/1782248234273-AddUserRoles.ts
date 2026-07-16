import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserRoles1782248234273 implements MigrationInterface {
  name = 'AddUserRoles1782248234273';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_roles_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "roles" "public"."users_roles_enum" array NOT NULL DEFAULT '{user}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(`DROP TYPE "public"."users_roles_enum"`);
  }
}

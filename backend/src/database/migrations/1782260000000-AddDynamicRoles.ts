import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Converts the fixed `users.roles` enum array into dynamic, DB-backed roles:
 * a `roles` table (seeded with the system roles) and a `user_roles` join
 * table. Existing role assignments are migrated before the old column is
 * dropped.
 */
export class AddDynamicRoles1782260000000 implements MigrationInterface {
  name = 'AddDynamicRoles1782260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // roles table
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "name" character varying(50) NOT NULL,
        "description" character varying(255),
        "is_system" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_roles_name" ON "roles" ("name")`,
    );

    // Seed the protected system roles.
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description", "is_system") VALUES
        ('user', 'Default role granted to every account', true),
        ('admin', 'Full administrative access', true)
    `);

    // join table
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_user" ON "user_roles" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_roles_role" ON "user_roles" ("role_id")`,
    );
    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "user_roles"
      ADD CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id")
      REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Migrate existing enum-array assignments into the join table.
    await queryRunner.query(`
      INSERT INTO "user_roles" ("user_id", "role_id")
      SELECT u."id", r."id"
      FROM "users" u
      JOIN "roles" r ON r."name" = ANY(u."roles"::text[])
    `);

    // Drop the old enum column and its type.
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "roles"`);
    await queryRunner.query(`DROP TYPE "users_roles_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "users_roles_enum" AS ENUM('user', 'admin')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "roles" "users_roles_enum" array NOT NULL DEFAULT '{user}'`,
    );

    // Rebuild the enum array from the join table (ignores any custom roles).
    await queryRunner.query(`
      UPDATE "users" u SET "roles" = sub.arr
      FROM (
        SELECT ur."user_id",
               array_agg(r."name"::"users_roles_enum") AS arr
        FROM "user_roles" ur
        JOIN "roles" r ON r."id" = ur."role_id"
        WHERE r."name" IN ('user', 'admin')
        GROUP BY ur."user_id"
      ) sub
      WHERE u."id" = sub."user_id"
    `);

    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_user_roles_user"`,
    );
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_roles_name"`);
    await queryRunner.query(`DROP TABLE "roles"`);
  }
}

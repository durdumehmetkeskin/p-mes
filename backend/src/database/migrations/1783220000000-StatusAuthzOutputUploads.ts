import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Role-model refinement: stage STATUS changes are now relationship-authorized
 * in the service (admin / process responsible = any transition; stage worker
 * = start/complete their own stage) — the `process-stages:update-status`
 * permission key is retired from every role. Members (stage workers) also
 * upload stage output/input documents at completion, so the `user` role gains
 * `attachments:create` (the service now membership-checks the upload owner).
 */
export class StatusAuthzOutputUploads1783220000000 implements MigrationInterface {
  name = 'StatusAuthzOutputUploads1783220000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = array_remove("permissions", 'process-stages:update-status')`,
    );
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT DISTINCT unnest("permissions" || $1::text[])
       )
       WHERE "name" = 'user'`,
      [['attachments:create']],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = array_remove("permissions", 'attachments:create')
       WHERE "name" = 'user'`,
    );
  }
}

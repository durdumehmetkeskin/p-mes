import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Structural process-stage editing (add/edit/connect/reorder/delete stages)
 * switched from permission keys to a relationship rule enforced in the
 * service: "process responsible or admin" (the rule the stage DELETE endpoint
 * always had). The now-unused keys are removed from every role so role
 * editing never resubmits keys the catalog no longer knows.
 */
export class ProcessEditorAuthz1783120000000 implements MigrationInterface {
  name = 'ProcessEditorAuthz1783120000000';

  private static readonly REMOVED_KEYS = [
    'process-stages:create-stages',
    'process-stages:create-reorder',
    'process-stages:delete',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "roles"
       SET "permissions" = ARRAY(
         SELECT unnest("permissions") EXCEPT SELECT unnest($1::text[])
       )`,
      [ProcessEditorAuthz1783120000000.REMOVED_KEYS],
    );
  }

  public async down(): Promise<void> {
    // The keys guarded routes that no longer exist under permission checks;
    // which roles held them is not recoverable — nothing to restore.
  }
}

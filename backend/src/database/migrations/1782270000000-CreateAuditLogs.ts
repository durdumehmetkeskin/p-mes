import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Append-only audit trail table. Indexed on the common filter/sort columns.
 * before/after are JSONB so full row snapshots are kept without data loss.
 */
export class CreateAuditLogs1782270000000 implements MigrationInterface {
  name = 'CreateAuditLogs1782270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "audit_logs_action_enum" AS ENUM('CREATE', 'UPDATE', 'DELETE')`,
    );
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" "audit_logs_action_enum" NOT NULL,
        "entity" character varying(100) NOT NULL,
        "entity_id" character varying(100),
        "actor_id" uuid,
        "actor_email" character varying(255),
        "before" jsonb,
        "after" jsonb,
        "changed_columns" text array,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_action" ON "audit_logs" ("action")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entity")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_entity_id" ON "audit_logs" ("entity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_actor_id" ON "audit_logs" ("actor_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_logs_created_at" ON "audit_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "audit_logs_action_enum"`);
  }
}

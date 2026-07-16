import { MigrationInterface, QueryRunner } from 'typeorm';

/** Persistent per-user in-app notifications. */
export class CreateNotifications1782720000000 implements MigrationInterface {
  name = 'CreateNotifications1782720000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "recipient_user_id" uuid NOT NULL,
        "type" character varying(40) NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" character varying(1000) NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "link" character varying(500),
        "entity_type" character varying(40),
        "entity_id" uuid,
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_notifications_recipient" ON "notifications" ("recipient_user_id")`,
    );
    await q(
      `CREATE INDEX "IDX_notifications_read" ON "notifications" ("is_read")`,
    );
    await q(
      `CREATE INDEX "IDX_notifications_entity" ON "notifications" ("entity_id")`,
    );
    await q(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_notifications_recipient" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}

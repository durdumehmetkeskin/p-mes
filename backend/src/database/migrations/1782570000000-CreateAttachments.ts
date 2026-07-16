import { MigrationInterface, QueryRunner } from 'typeorm';

/** File-attachment metadata (binaries live in MinIO). */
export class CreateAttachments1782570000000 implements MigrationInterface {
  name = 'CreateAttachments1782570000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await q(
      `CREATE TYPE "attachment_owner_type_enum" AS ENUM('project','process','stage')`,
    );
    await q(`
      CREATE TABLE "attachments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "owner_type" "attachment_owner_type_enum" NOT NULL,
        "owner_id" uuid NOT NULL,
        "file_name" character varying(500) NOT NULL,
        "object_key" character varying(500) NOT NULL,
        "content_type" character varying(255) NOT NULL,
        "size" integer NOT NULL DEFAULT 0,
        "uploaded_by_id" uuid,
        CONSTRAINT "PK_attachments_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_attachments_owner" ON "attachments" ("owner_type", "owner_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`DROP TABLE IF EXISTS "attachments"`);
    await q(`DROP TYPE IF EXISTS "attachment_owner_type_enum"`);
  }
}

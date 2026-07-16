import { MigrationInterface, QueryRunner } from 'typeorm';

const STATUSES = ['active', 'passive', 'completed', 'canceled'] as const;

/**
 * Replaces the free-text `projects.status` varchar with a fixed
 * `project_status_enum` (active | passive | completed | canceled).
 * Existing values are normalized first: known names map case-insensitively
 * ('cancelled' → 'canceled'); everything else (NULL, empty, custom text)
 * falls back to 'active'.
 */
export class ProjectStatusEnum1783030000000 implements MigrationInterface {
  name = 'ProjectStatusEnum1783030000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "projects" SET "status" = CASE LOWER(TRIM(COALESCE("status", '')))
        WHEN 'passive' THEN 'passive'
        WHEN 'completed' THEN 'completed'
        WHEN 'canceled' THEN 'canceled'
        WHEN 'cancelled' THEN 'canceled'
        ELSE 'active'
      END
    `);
    await queryRunner.query(`
      CREATE TYPE "project_status_enum" AS ENUM(${STATUSES.map((s) => `'${s}'`).join(', ')})
    `);
    await queryRunner.query(`
      ALTER TABLE "projects"
        ALTER COLUMN "status" TYPE "project_status_enum" USING "status"::"project_status_enum",
        ALTER COLUMN "status" SET DEFAULT 'active',
        ALTER COLUMN "status" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "projects"
        ALTER COLUMN "status" DROP DEFAULT,
        ALTER COLUMN "status" TYPE character varying(50) USING "status"::text,
        ALTER COLUMN "status" DROP NOT NULL
    `);
    await queryRunner.query(`DROP TYPE "project_status_enum"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Production locations: locations → sections (reservable per order over a date
 * range) and per-location sensor data files + temperature/humidity readings.
 */
export class CreateLocationModule1782580000000 implements MigrationInterface {
  name = 'CreateLocationModule1782580000000';

  private readonly base = `
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,`;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    await q(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await q(`
      CREATE TABLE "locations" (${this.base}
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_locations_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE UNIQUE INDEX "UQ_locations_code" ON "locations" ("code") WHERE "deletedAt" IS NULL`,
    );

    await q(`
      CREATE TABLE "sections" (${this.base}
        "location_id" uuid NOT NULL,
        "code" character varying(50) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" character varying(1000),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_sections_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_sections_location" ON "sections" ("location_id")`,
    );
    await q(
      `ALTER TABLE "sections" ADD CONSTRAINT "FK_sections_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "section_reservations" (${this.base}
        "section_id" uuid NOT NULL,
        "order_id" uuid NOT NULL,
        "start_date" date NOT NULL,
        "end_date" date NOT NULL,
        "note" character varying(500),
        CONSTRAINT "PK_section_reservations_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_section_reservations_section" ON "section_reservations" ("section_id")`,
    );
    await q(
      `CREATE INDEX "IDX_section_reservations_order" ON "section_reservations" ("order_id")`,
    );
    await q(
      `ALTER TABLE "section_reservations" ADD CONSTRAINT "FK_section_reservations_section" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "section_reservations" ADD CONSTRAINT "FK_section_reservations_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "location_data_files" (${this.base}
        "location_id" uuid NOT NULL,
        "file_name" character varying(500) NOT NULL,
        "object_key" character varying(500) NOT NULL,
        "content_type" character varying(255) NOT NULL,
        "size" integer NOT NULL DEFAULT 0,
        "reading_count" integer NOT NULL DEFAULT 0,
        "start_time" TIMESTAMP WITH TIME ZONE,
        "end_time" TIMESTAMP WITH TIME ZONE,
        "uploaded_by_id" uuid,
        CONSTRAINT "PK_location_data_files_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_location_data_files_location" ON "location_data_files" ("location_id")`,
    );
    await q(
      `ALTER TABLE "location_data_files" ADD CONSTRAINT "FK_location_data_files_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await q(`
      CREATE TABLE "location_readings" (${this.base}
        "location_id" uuid NOT NULL,
        "data_file_id" uuid NOT NULL,
        "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "temperature" numeric(6,2) NOT NULL,
        "humidity" numeric(6,2) NOT NULL,
        CONSTRAINT "PK_location_readings_id" PRIMARY KEY ("id")
      )`);
    await q(
      `CREATE INDEX "IDX_location_readings_loc_time" ON "location_readings" ("location_id", "recorded_at")`,
    );
    await q(
      `CREATE INDEX "IDX_location_readings_file" ON "location_readings" ("data_file_id")`,
    );
    await q(
      `ALTER TABLE "location_readings" ADD CONSTRAINT "FK_location_readings_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await q(
      `ALTER TABLE "location_readings" ADD CONSTRAINT "FK_location_readings_file" FOREIGN KEY ("data_file_id") REFERENCES "location_data_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const q = (sql: string) => queryRunner.query(sql);
    for (const t of [
      'location_readings',
      'location_data_files',
      'section_reservations',
      'sections',
      'locations',
    ]) {
      await q(`DROP TABLE IF EXISTS "${t}"`);
    }
  }
}

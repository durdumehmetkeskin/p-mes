import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Drop the reservations table — reservation is now a reserved stock item split
 * off from an available one (see stock_items).
 */
export class DropReservations1782820000000 implements MigrationInterface {
  name = 'DropReservations1782820000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."reservations_status_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Best-effort recreate of the removed table (feature retired).
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('active', 'released', 'fulfilled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "reservations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "material_id" uuid NOT NULL,
        "warehouse_id" uuid NOT NULL,
        "rack_id" uuid,
        "lot_id" uuid,
        "quantity" numeric(14,3) NOT NULL,
        "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'active',
        "note" character varying(500),
        CONSTRAINT "PK_reservations_id" PRIMARY KEY ("id")
      )
    `);
  }
}

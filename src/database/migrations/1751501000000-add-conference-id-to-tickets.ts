import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConferenceIdToTickets1751501000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add conferenceId column to tickets table
    await queryRunner.query(`
      ALTER TABLE "tickets" 
      ADD COLUMN "conferenceId" varchar(255)
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_conference_id" ON "tickets" ("conferenceId")
    `);

    // Add index for purchase date for analytics queries
    await queryRunner.query(`
      CREATE INDEX "idx_tickets_purchase_date" ON "tickets" ("purchaseDate")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tickets_purchase_date"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_tickets_conference_id"
    `);

    // Remove column
    await queryRunner.query(`
      ALTER TABLE "tickets" DROP COLUMN "conferenceId"
    `);
  }
} 
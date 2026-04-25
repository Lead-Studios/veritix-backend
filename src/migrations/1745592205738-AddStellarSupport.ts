import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStellarSupport1745592205738 implements MigrationInterface {
  name = 'AddStellarSupport1745592205738'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add stellar columns to ticket_purchase table
    await queryRunner.query(`ALTER TABLE "ticket_purchase" ADD COLUMN "stellarMemo" character varying`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" ADD COLUMN "totalAmountXLM" numeric(10,7)`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" ADD COLUMN "stellarTxHash" character varying`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" ADD COLUMN "refundTxHash" character varying`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" ADD COLUMN "status" character varying NOT NULL DEFAULT 'PENDING'`);

    // Add stellarWalletAddress to user table
    await queryRunner.query(`ALTER TABLE "user" ADD COLUMN "stellarWalletAddress" character varying`);

    // Add status to ticket table
    await queryRunner.query(`ALTER TABLE "ticket" ADD COLUMN "status" character varying NOT NULL DEFAULT 'ACTIVE'`);

    // Create stellar_cursor table
    await queryRunner.query(`CREATE TABLE "stellar_cursor" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cursor" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_stellar_cursor" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_stellar_cursor_cursor" ON "stellar_cursor" ("cursor")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop stellar_cursor table
    await queryRunner.query(`DROP INDEX "IDX_stellar_cursor_cursor"`);
    await queryRunner.query(`DROP TABLE "stellar_cursor"`);

    // Remove status from ticket table
    await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "status"`);

    // Remove stellarWalletAddress from user table
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "stellarWalletAddress"`);

    // Remove stellar columns from ticket_purchase table
    await queryRunner.query(`ALTER TABLE "ticket_purchase" DROP COLUMN "status"`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" DROP COLUMN "refundTxHash"`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" DROP COLUMN "stellarTxHash"`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" DROP COLUMN "totalAmountXLM"`);
    await queryRunner.query(`ALTER TABLE "ticket_purchase" DROP COLUMN "stellarMemo"`);
  }
}

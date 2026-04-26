import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketTransfersTable1777211168463 implements MigrationInterface {
  name = 'CreateTicketTransfersTable1777211168463';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ticket_transfers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "ticketId" uuid NOT NULL,
        "fromUserId" uuid NOT NULL,
        "toUserId" uuid NOT NULL,
        "resalePriceUSD" decimal(10,2),
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ticket_transfers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "ticket_transfers"
      ADD CONSTRAINT "FK_ticket_transfers_ticket" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket_transfers" DROP CONSTRAINT "FK_ticket_transfers_ticket"
    `);
    await queryRunner.query(`
      DROP TABLE "ticket_transfers"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxResalePriceToTicketTypes1777211168462 implements MigrationInterface {
  name = 'AddMaxResalePriceToTicketTypes1777211168462';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket_types"
      ADD "maxResalePriceUSD" decimal(10,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "ticket_types"
      DROP COLUMN "maxResalePriceUSD"
    `);
  }
}

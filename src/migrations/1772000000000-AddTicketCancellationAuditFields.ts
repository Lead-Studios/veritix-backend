import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTicketCancellationAuditFields1772000000000
  implements MigrationInterface
{
  name = 'AddTicketCancellationAuditFields1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tickets" ADD "cancelledAt" TIMESTAMP',
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "tickets"."cancelledAt" IS 'When ticket was cancelled'`,
    );
    await queryRunner.query(
      'ALTER TABLE "tickets" ADD "cancellationReason" character varying',
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "tickets"."cancellationReason" IS 'Reason provided when ticket was cancelled'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tickets" DROP COLUMN "cancellationReason"',
    );
    await queryRunner.query('ALTER TABLE "tickets" DROP COLUMN "cancelledAt"');
  }
}

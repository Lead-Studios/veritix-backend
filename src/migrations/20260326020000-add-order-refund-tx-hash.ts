import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderRefundTxHash20260326020000
  implements MigrationInterface
{
  name = 'AddOrderRefundTxHash20260326020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD COLUMN IF NOT EXISTS "refund_tx_hash" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
      DROP COLUMN IF EXISTS "refund_tx_hash"
    `);
  }
}

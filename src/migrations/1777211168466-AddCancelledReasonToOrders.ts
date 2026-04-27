import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledReasonToOrders1777211168466
  implements MigrationInterface
{
  name = 'AddCancelledReasonToOrders1777211168466';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_cancelledreason_enum" AS ENUM('EXPIRED','MANUAL','ADMIN')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "cancelledReason" "public"."orders_cancelledreason_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "cancelledReason"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."orders_cancelledreason_enum"`,
    );
  }
}
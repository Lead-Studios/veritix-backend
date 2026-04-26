import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrganizationFieldsToUsers1776904642004 implements MigrationInterface {
  name = 'AddOrganizationFieldsToUsers1776904642004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add organizationName column to users table if it doesn't exist
    let hasColumn = await queryRunner.hasColumn('users', 'organizationName');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "organizationName" varchar NULL`,
      );
    }

    // Add organizationWebsite column to users table if it doesn't exist
    hasColumn = await queryRunner.hasColumn('users', 'organizationWebsite');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "organizationWebsite" varchar NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "organizationWebsite"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "organizationName"`,
    );
  }
}

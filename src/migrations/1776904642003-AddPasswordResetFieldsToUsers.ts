import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetFieldsToUsers1776904642003 implements MigrationInterface {
  name = 'AddPasswordResetFieldsToUsers1776904642003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add passwordResetCode column to users table if it doesn't exist
    let hasColumn = await queryRunner.hasColumn('users', 'passwordResetCode');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "passwordResetCode" varchar NULL`,
      );
    }

    // Add passwordResetCodeExpiresAt column to users table if it doesn't exist
    hasColumn = await queryRunner.hasColumn(
      'users',
      'passwordResetCodeExpiresAt',
    );
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "passwordResetCodeExpiresAt" TIMESTAMP NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "passwordResetCodeExpiresAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "passwordResetCode"`,
    );
  }
}

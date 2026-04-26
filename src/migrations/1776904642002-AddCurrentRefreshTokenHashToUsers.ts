import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurrentRefreshTokenHashToUsers1776904642002 implements MigrationInterface {
  name = 'AddCurrentRefreshTokenHashToUsers1776904642002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add currentRefreshTokenHash column to users table if it doesn't exist
    const hasColumn = await queryRunner.hasColumn(
      'users',
      'currentRefreshTokenHash',
    );
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "currentRefreshTokenHash" varchar NULL`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "currentRefreshTokenHash"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenVersionToUsers1776904642001 implements MigrationInterface {
  name = 'AddTokenVersionToUsers1776904642001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add tokenVersion column to users table if it doesn't exist
    const hasColumn = await queryRunner.hasColumn('users', 'tokenVersion');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "tokenVersion" integer NOT NULL DEFAULT 0`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tokenVersion"`);
  }
}

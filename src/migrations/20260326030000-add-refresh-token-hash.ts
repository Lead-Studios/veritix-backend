import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenHash20260326030000 implements MigrationInterface {
  name = 'AddRefreshTokenHash20260326030000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "currentRefreshTokenHash" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "currentRefreshTokenHash"
    `);
  }
}

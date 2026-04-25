import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSuspensionFields1776904642005 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "suspensionReason" VARCHAR
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "suspendedAt",
        DROP COLUMN IF EXISTS "suspensionReason"
    `);
  }
}

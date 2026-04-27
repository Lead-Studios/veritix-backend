import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialIdsToUsers1777211168467 implements MigrationInterface {
  name = 'AddSocialIdsToUsers1777211168467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "googleId" character varying NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_googleId" UNIQUE ("googleId")
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "githubId" character varying NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_githubId" UNIQUE ("githubId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "UQ_users_githubId"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "githubId"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "UQ_users_googleId"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "googleId"
    `);
  }
}
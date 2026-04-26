import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBioAndCountryToUsers1777211168464 implements MigrationInterface {
  name = 'AddBioAndCountryToUsers1777211168464';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "bio" text NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "country" character varying NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "country"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN "bio"
    `);
  }
}

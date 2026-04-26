import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLatitudeLongitudeToEvents1777211168465 implements MigrationInterface {
  name = 'AddLatitudeLongitudeToEvents1777211168465';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD "latitude" decimal(10,8) NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "events"
      ADD "longitude" decimal(11,8) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "events" DROP COLUMN "longitude"
    `);
    await queryRunner.query(`
      ALTER TABLE "events" DROP COLUMN "latitude"
    `);
  }
}

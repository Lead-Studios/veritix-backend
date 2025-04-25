import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1745487024899 implements MigrationInterface {
    name = 'InitialMigration1745487024899'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "isVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "profileImageUrl" SET DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "profileImageUrl" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isVerified"`);
    }

}

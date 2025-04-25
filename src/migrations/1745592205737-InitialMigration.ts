import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1745592205737 implements MigrationInterface {
    name = 'InitialMigration1745592205737'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" RENAME COLUMN "emailVerified" TO "isVerified"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin" RENAME COLUMN "isVerified" TO "emailVerified"`);
    }

}

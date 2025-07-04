import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEventDashboardFields1751496311915 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event" ADD "date" TIMESTAMP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event" ADD "country" VARCHAR(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event" ADD "state" VARCHAR(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event" ADD "street" VARCHAR(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event" ADD "localGovernment" VARCHAR(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event" ADD "ticketQuantity" integer NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "ticketQuantity"`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "localGovernment"`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "street"`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "state"`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "country"`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "date"`);
    }

}

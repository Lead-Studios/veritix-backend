import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPosterEntity1751431139415 implements MigrationInterface {
    name = 'AddPosterEntity1751431139415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "special_guest" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "image" character varying NOT NULL, "name" character varying NOT NULL, "facebook" character varying, "twitter" character varying, "instagram" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "eventId" uuid, CONSTRAINT "PK_5966e80e6f748bddf7adbf171ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "special_guest" ADD CONSTRAINT "FK_2f190591ca9362781985e9dbe1a" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "special_guest" DROP CONSTRAINT "FK_2f190591ca9362781985e9dbe1a"`);
        await queryRunner.query(`DROP TABLE "special_guest"`);
    }

}

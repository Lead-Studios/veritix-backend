import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1745413182832 implements MigrationInterface {
    name = 'InitialMigration1745413182832'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "special_guest" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "imageUrl" character varying NOT NULL, "facebook" character varying, "twitter" character varying, "instagram" character varying, "eventId" uuid, CONSTRAINT "PK_5966e80e6f748bddf7adbf171ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sponsor" ("id" SERIAL NOT NULL, "brandImage" character varying NOT NULL, "brandName" character varying NOT NULL, "brandWebsite" character varying NOT NULL, "socialMediaLinks" json NOT NULL, CONSTRAINT "PK_31c4354cde945c685aabe017541" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "poster" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "imageUrl" character varying NOT NULL, "description" character varying NOT NULL, "eventId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_653af1301e69e557fc1375ced90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "collaborator" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "email" character varying NOT NULL, "imageUrl" character varying NOT NULL, "eventId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_aa48142926d7bdb485d21ad2696" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "event_gallery" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "imageUrl" character varying NOT NULL, "description" character varying NOT NULL, "eventId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_69c52949fbf907da73a479af728" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "event" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "eventName" character varying NOT NULL, "eventCategory" character varying NOT NULL, "eventDate" TIMESTAMP NOT NULL, "eventClosingDate" TIMESTAMP NOT NULL, "eventDescription" text NOT NULL, "country" character varying NOT NULL, "state" character varying NOT NULL, "street" character varying NOT NULL, "localGovernment" character varying NOT NULL, "direction" character varying, "eventImage" character varying, "hideEventLocation" boolean NOT NULL DEFAULT false, "eventComingSoon" boolean NOT NULL DEFAULT false, "transactionCharge" boolean NOT NULL DEFAULT false, "bankName" character varying, "bankAccountNumber" character varying, "accountName" character varying, "facebook" character varying, "twitter" character varying, "instagram" character varying, "isArchived" boolean NOT NULL DEFAULT false, "deletedAt" TIMESTAMP, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "ticket" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "eventId" uuid NOT NULL, "quantity" integer NOT NULL, "price" numeric(10,2) NOT NULL, "description" text NOT NULL, "deadlineDate" TIMESTAMP NOT NULL, "isReserved" boolean NOT NULL DEFAULT false, "isUsed" boolean NOT NULL DEFAULT false, "transactionId" character varying, "purchaseDate" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying, CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "admin" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'admin', "emailVerified" boolean NOT NULL DEFAULT false, "refreshToken" character varying, "resetToken" character varying, "resetTokenExpiry" TIMESTAMP, "verificationToken" character varying, "verificationTokenExpiry" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e032310bcef831fb83101899b10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "sponsor_events_event" ("sponsorId" integer NOT NULL, "eventId" uuid NOT NULL, CONSTRAINT "PK_02f3e3b34f94b4f9e6f7f7e76a3" PRIMARY KEY ("sponsorId", "eventId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1a78b255ad0d793c8005a29fc2" ON "sponsor_events_event" ("sponsorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_254645e856f857452a9f4b316e" ON "sponsor_events_event" ("eventId") `);
        await queryRunner.query(`ALTER TABLE "special_guest" ADD CONSTRAINT "FK_2f190591ca9362781985e9dbe1a" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "poster" ADD CONSTRAINT "FK_b81cc99f258b6c60011bc39cad3" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "collaborator" ADD CONSTRAINT "FK_175d5d1512bc3d7c675efc4e729" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "event_gallery" ADD CONSTRAINT "FK_15094c3641222356b9c1e3c4471" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_cb22a51617991265571be41b74f" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sponsor_events_event" ADD CONSTRAINT "FK_1a78b255ad0d793c8005a29fc2f" FOREIGN KEY ("sponsorId") REFERENCES "sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "sponsor_events_event" ADD CONSTRAINT "FK_254645e856f857452a9f4b316e0" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sponsor_events_event" DROP CONSTRAINT "FK_254645e856f857452a9f4b316e0"`);
        await queryRunner.query(`ALTER TABLE "sponsor_events_event" DROP CONSTRAINT "FK_1a78b255ad0d793c8005a29fc2f"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_cb22a51617991265571be41b74f"`);
        await queryRunner.query(`ALTER TABLE "event_gallery" DROP CONSTRAINT "FK_15094c3641222356b9c1e3c4471"`);
        await queryRunner.query(`ALTER TABLE "collaborator" DROP CONSTRAINT "FK_175d5d1512bc3d7c675efc4e729"`);
        await queryRunner.query(`ALTER TABLE "poster" DROP CONSTRAINT "FK_b81cc99f258b6c60011bc39cad3"`);
        await queryRunner.query(`ALTER TABLE "special_guest" DROP CONSTRAINT "FK_2f190591ca9362781985e9dbe1a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_254645e856f857452a9f4b316e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1a78b255ad0d793c8005a29fc2"`);
        await queryRunner.query(`DROP TABLE "sponsor_events_event"`);
        await queryRunner.query(`DROP TABLE "admin"`);
        await queryRunner.query(`DROP TABLE "ticket"`);
        await queryRunner.query(`DROP TABLE "event"`);
        await queryRunner.query(`DROP TABLE "event_gallery"`);
        await queryRunner.query(`DROP TABLE "collaborator"`);
        await queryRunner.query(`DROP TABLE "poster"`);
        await queryRunner.query(`DROP TABLE "sponsor"`);
        await queryRunner.query(`DROP TABLE "special_guest"`);
    }

}

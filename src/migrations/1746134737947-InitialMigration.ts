import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1746134737947 implements MigrationInterface {
    name = 'InitialMigration1746134737947'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "event" RENAME COLUMN "eventCategory" TO "categoryId"`);
        await queryRunner.query(`CREATE TABLE "category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_23c05c292c439d77b0de816b500" UNIQUE ("name"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "conferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "conference_name" character varying NOT NULL, "conference_category" character varying NOT NULL, "conference_date" TIMESTAMP NOT NULL, "conference_closing_date" TIMESTAMP NOT NULL, "conference_description" text NOT NULL, "conference_image" character varying NOT NULL, "country" character varying NOT NULL, "state" character varying NOT NULL, "street" character varying NOT NULL, "local_government" character varying NOT NULL, "direction" character varying, "hide_location" boolean NOT NULL DEFAULT false, "coming_soon" boolean NOT NULL DEFAULT false, "transaction_charge" boolean NOT NULL DEFAULT false, "bank_name" character varying NOT NULL, "bank_account_number" character varying NOT NULL, "account_name" character varying NOT NULL, "facebook" character varying, "twitter" character varying, "instagram" character varying, "organizerId" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d28afb89755d548215ce4e7667b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "conferenceId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "categoryId"`);
        await queryRunner.query(`ALTER TABLE "event" ADD "categoryId" uuid`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "PK_d9a0835407701eb86f874474b7c"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum" RENAME TO "user_role_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum" AS ENUM('Admin', 'User', 'Guest', 'Organizer')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum" USING "role"::"text"::"public"."user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'User'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "event" ADD CONSTRAINT "FK_d44e52c4ca04619ef9b61a11982" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "FK_60b3afd8b0294ebd2c149c1f7c9" FOREIGN KEY ("conferenceId") REFERENCES "conferences"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "conferences" ADD CONSTRAINT "FK_dbd2a9a6249e8b24fc403ef3cf2" FOREIGN KEY ("organizerId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conferences" DROP CONSTRAINT "FK_dbd2a9a6249e8b24fc403ef3cf2"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "FK_60b3afd8b0294ebd2c149c1f7c9"`);
        await queryRunner.query(`ALTER TABLE "event" DROP CONSTRAINT "FK_d44e52c4ca04619ef9b61a11982"`);
        await queryRunner.query(`CREATE TYPE "public"."user_role_enum_old" AS ENUM('Admin', 'User', 'Guest')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" TYPE "public"."user_role_enum_old" USING "role"::"text"::"public"."user_role_enum_old"`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'User'`);
        await queryRunner.query(`DROP TYPE "public"."user_role_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP CONSTRAINT "PK_d9a0835407701eb86f874474b7c"`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "id"`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD "id" uuid NOT NULL DEFAULT uuid_generate_v4()`);
        await queryRunner.query(`ALTER TABLE "ticket" ADD CONSTRAINT "PK_d9a0835407701eb86f874474b7c" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "event" DROP COLUMN "categoryId"`);
        await queryRunner.query(`ALTER TABLE "event" ADD "categoryId" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "ticket" DROP COLUMN "conferenceId"`);
        await queryRunner.query(`DROP TABLE "conferences"`);
        await queryRunner.query(`DROP TABLE "category"`);
        await queryRunner.query(`ALTER TABLE "event" RENAME COLUMN "categoryId" TO "eventCategory"`);
    }

}

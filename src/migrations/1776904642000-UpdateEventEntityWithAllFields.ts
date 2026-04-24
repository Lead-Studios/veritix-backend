import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateEventEntityWithAllFields1776904642000 implements MigrationInterface {
    name = 'UpdateEventEntityWithAllFields1776904642000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create EventStatus enum
        await queryRunner.query(`CREATE TYPE "public"."events_status_enum" AS ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'POSTPONED', 'COMPLETED')`);
        
        // Create events table with all required fields
        await queryRunner.query(`CREATE TABLE "events" (
            "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
            "title" character varying NOT NULL,
            "description" text,
            "status" "public"."events_status_enum" NOT NULL DEFAULT 'DRAFT',
            "organizerId" uuid NOT NULL,
            "venue" character varying NOT NULL,
            "city" character varying,
            "countryCode" character varying(2),
            "isVirtual" boolean NOT NULL DEFAULT false,
            "imageUrl" character varying,
            "eventDate" TIMESTAMP WITH TIME ZONE NOT NULL,
            "eventClosingDate" TIMESTAMP WITH TIME ZONE,
            "capacity" integer NOT NULL DEFAULT 0,
            "tags" text array DEFAULT '{}',
            "isArchived" boolean NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
            "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "PK_40f9b6c2b2d7abed91b00c3c4de" PRIMARY KEY ("id"),
            CONSTRAINT "FK_events_users" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE
        )`, undefined);
        
        // Create index on organizerId for faster lookups
        await queryRunner.query(`CREATE INDEX "IDX_events_organizerId" ON "events" ("organizerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop index
        await queryRunner.query(`DROP INDEX "public"."IDX_events_organizerId"`);
        
        // Drop table
        await queryRunner.query(`DROP TABLE "events"`);
        
        // Drop enum
        await queryRunner.query(`DROP TYPE "public"."events_status_enum"`);
    }
}

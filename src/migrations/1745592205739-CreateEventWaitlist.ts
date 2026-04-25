import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventWaitlist1745592205739 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "event_waitlist" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "eventId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "ticketTypeId" uuid,
        "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "notifiedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_event_waitlist" PRIMARY KEY ("id"),
        CONSTRAINT "FK_event_waitlist_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_event_waitlist_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "event_waitlist"`);
  }
}

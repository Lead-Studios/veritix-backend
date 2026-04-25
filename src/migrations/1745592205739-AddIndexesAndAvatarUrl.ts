import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesAndAvatarUrl1745592205739 implements MigrationInterface {
  name = 'AddIndexesAndAvatarUrl1745592205739';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // User: avatarUrl column
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" character varying`);

    // User: qrCode column on tickets
    await queryRunner.query(`ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "qrCode" character varying`);

    // Unique indexes
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_tickets_qrCode" ON "tickets" ("qrCode") WHERE "qrCode" IS NOT NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_orders_stellarMemo" ON "orders" ("stellarMemo")`);

    // User composite indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_isVerified_deletedAt" ON "users" ("isVerified", "deletedAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_role" ON "users" ("role")`);

    // Event composite indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_status_eventDate" ON "events" ("status", "eventDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_organizerId_status" ON "events" ("organizerId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_events_isArchived_status" ON "events" ("isArchived", "status")`);

    // TicketType composite index
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ticket_types_eventId_isActive" ON "ticket_types" ("eventId", "isActive")`);

    // Ticket indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_userId" ON "tickets" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_eventId_status" ON "tickets" ("eventId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tickets_orderReference" ON "tickets" ("orderReference")`);

    // Order indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_userId_status" ON "orders" ("userId", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_expiresAt_status" ON "orders" ("expiresAt", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_stellarTxHash" ON "orders" ("stellarTxHash") WHERE "stellarTxHash" IS NOT NULL`);

    // VerificationLog indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_verification_logs_eventId_verifiedAt" ON "verification_logs" ("eventId", "verifiedAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_verification_logs_ticketId" ON "verification_logs" ("ticketId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_verification_logs_ticketId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_verification_logs_eventId_verifiedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_stellarTxHash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_expiresAt_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_userId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_orderReference"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_eventId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ticket_types_eventId_isActive"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_isArchived_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_organizerId_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_status_eventDate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_isVerified_deletedAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_stellarMemo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_qrCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "qrCode"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatarUrl"`);
  }
}

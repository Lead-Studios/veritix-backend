import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1776904642006 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "audit_action_enum" AS ENUM (
        'ROLE_CHANGE',
        'USER_SUSPENDED',
        'USER_UNSUSPENDED',
        'MANUAL_REFUND',
        'TICKET_CANCELLED',
        'EVENT_APPROVED',
        'EVENT_REJECTED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"          UUID              NOT NULL DEFAULT uuid_generate_v4(),
        "actorId"     UUID              NOT NULL,
        "actorEmail"  VARCHAR           NOT NULL,
        "action"      "audit_action_enum" NOT NULL,
        "targetType"  VARCHAR           NOT NULL,
        "targetId"    UUID              NOT NULL,
        "details"     JSONB,
        "performedAt" TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
  }
}

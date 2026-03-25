import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdminAuditLogs1772100000000 implements MigrationInterface {
  name = 'CreateAdminAuditLogs1772100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."admin_audit_logs_action_enum" AS ENUM(
        'ROLE_CHANGE',
        'USER_SUSPENDED',
        'USER_UNSUSPENDED',
        'MANUAL_REFUND',
        'TICKET_CANCELLED'
      )
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."admin_audit_logs_targettype_enum" AS ENUM(
        'user',
        'event',
        'order',
        'ticket'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "admin_audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorId" uuid NOT NULL,
        "actorEmail" character varying NOT NULL,
        "action" "public"."admin_audit_logs_action_enum" NOT NULL,
        "targetType" "public"."admin_audit_logs_targettype_enum" NOT NULL,
        "targetId" character varying NOT NULL,
        "details" jsonb,
        "performedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_logs_actor_id" ON "admin_audit_logs" ("actorId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_logs_action" ON "admin_audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_logs_target" ON "admin_audit_logs" ("targetType", "targetId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_admin_audit_logs_performed_at" ON "admin_audit_logs" ("performedAt") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_admin_audit_logs_performed_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_admin_audit_logs_target"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_admin_audit_logs_action"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_admin_audit_logs_actor_id"`,
    );
    await queryRunner.query(`DROP TABLE "admin_audit_logs"`);
    await queryRunner.query(
      `DROP TYPE "public"."admin_audit_logs_targettype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."admin_audit_logs_action_enum"`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAdminUserManagementFields20260326010000
  implements MigrationInterface
{
  name = 'AddAdminUserManagementFields20260326010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."user_role_enum" ADD VALUE IF NOT EXISTS 'ORGANIZER'
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
      ADD COLUMN IF NOT EXISTS "isSuspended" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "suspensionReason" text,
      ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "tokenVersion" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
      DROP COLUMN IF EXISTS "tokenVersion",
      DROP COLUMN IF EXISTS "suspendedAt",
      DROP COLUMN IF EXISTS "suspensionReason",
      DROP COLUMN IF EXISTS "isSuspended"
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'user_role_enum'
        ) THEN
          CREATE TYPE "public"."user_role_enum_old" AS ENUM('SUBSCRIBER', 'ADMIN');

          ALTER TABLE "user"
          ALTER COLUMN "role" DROP DEFAULT,
          ALTER COLUMN "role" TYPE "public"."user_role_enum_old"
          USING (
            CASE
              WHEN "role"::text = 'ORGANIZER' THEN 'SUBSCRIBER'
              ELSE "role"::text
            END
          )::"public"."user_role_enum_old";

          DROP TYPE "public"."user_role_enum";
          ALTER TYPE "public"."user_role_enum_old" RENAME TO "user_role_enum";
          ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'SUBSCRIBER';
        END IF;
      END $$;
    `);
  }
}

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDynamicPricingToTicketTiers1751500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add pricing_strategy enum type
    await queryRunner.query(`
      CREATE TYPE "public"."pricing_strategy_enum" AS ENUM('fixed', 'linear', 'threshold', 'exponential')
    `);

    // Add new columns to ticket_tier table
    await queryRunner.query(`
      ALTER TABLE "ticket_tier" 
      ADD COLUMN "pricingStrategy" "public"."pricing_strategy_enum" NOT NULL DEFAULT 'fixed'
    `);

    await queryRunner.query(`
      ALTER TABLE "ticket_tier" 
      ADD COLUMN "pricingConfig" json
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove columns
    await queryRunner.query(`
      ALTER TABLE "ticket_tier" DROP COLUMN "pricingConfig"
    `);

    await queryRunner.query(`
      ALTER TABLE "ticket_tier" DROP COLUMN "pricingStrategy"
    `);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE "public"."pricing_strategy_enum"
    `);
  }
} 
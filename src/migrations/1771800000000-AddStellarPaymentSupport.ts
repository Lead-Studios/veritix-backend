import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStellarPaymentSupport1771800000000 implements MigrationInterface {
  name = 'AddStellarPaymentSupport1771800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create orders table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "total_amount_xlm" numeric(18,7) NOT NULL,
        "total_amount_usd" numeric(18,7) NOT NULL,
        "stellar_memo" character varying(28) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "stellar_tx_hash" character varying(64),
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_orders_stellar_memo" UNIQUE ("stellar_memo")
      )
    `);

    // Create order_items table if it doesn't exist
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "order_id" uuid NOT NULL,
        "ticket_type_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price_xlm" numeric(18,7) NOT NULL,
        "subtotal_xlm" numeric(18,7) NOT NULL,
        CONSTRAINT "PK_order_items" PRIMARY KEY ("id")
      )
    `);

    // Create stellar_cursors table
    await queryRunner.query(`
      CREATE TABLE "stellar_cursors" (
        "key" character varying(50) NOT NULL,
        "cursor" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stellar_cursors" PRIMARY KEY ("key")
      )
    `);

    // Create indexes for orders
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_user_id" ON "orders" ("user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_event_id" ON "orders" ("event_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_stellar_memo" ON "orders" ("stellar_memo")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_stellar_tx_hash" ON "orders" ("stellar_tx_hash")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_orders_status" ON "orders" ("status")
    `);

    // Create indexes for order_items
    await queryRunner.query(`
      CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_order_items_ticket_type_id" ON "order_items" ("ticket_type_id")
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "FK_order_items_order"
      FOREIGN KEY ("order_id") REFERENCES "orders"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "order_items"
      ADD CONSTRAINT "FK_order_items_ticket_type"
      FOREIGN KEY ("ticket_type_id") REFERENCES "ticket_types"("id")
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_ticket_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_order"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_ticket_type_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_stellar_tx_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_stellar_memo"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_event_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_user_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "stellar_cursors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
  }
}

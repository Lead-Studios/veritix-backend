import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersAndTicketsTables1776904641126 implements MigrationInterface {
  name = 'CreateOrdersAndTicketsTables1776904641126';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING','PAID','FAILED','REFUNDED','CANCELLED')`,
    );
    await queryRunner.query(`CREATE TABLE "orders" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "eventId" uuid NOT NULL,
      "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING',
      "totalAmountUSD" numeric(10,2) NOT NULL DEFAULT '0',
      "totalAmountXLM" numeric(18,7) NOT NULL DEFAULT '0',
      "stellarMemo" character varying NOT NULL,
      "stellarTxHash" character varying,
      "refundTxHash" character varying,
      "expiresAt" TIMESTAMP NOT NULL,
      "paidAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_dd3c6e943b3fdea5a2f7b18fab4" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_orders_stellarMemo" UNIQUE ("stellarMemo"),
      CONSTRAINT "UQ_orders_stellarTxHash" UNIQUE ("stellarTxHash"),
      CONSTRAINT "UQ_orders_refundTxHash" UNIQUE ("refundTxHash")
    )`);
    await queryRunner.query(`CREATE TABLE "order_items" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "orderId" uuid NOT NULL,
      "ticketTypeId" uuid NOT NULL,
      "quantity" integer NOT NULL,
      "unitPriceUSD" numeric(10,2) NOT NULL,
      "subtotalUSD" numeric(10,2) NOT NULL,
      CONSTRAINT "PK_0ab33ff4f70fb65f8c7ae9ed85f" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(`CREATE TABLE "tickets" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "userId" uuid NOT NULL,
      "eventId" uuid NOT NULL,
      "ticketTypeId" uuid NOT NULL,
      "orderReference" uuid,
      "status" character varying NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_16d42a05b49f3471d1a3efd7e56" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD CONSTRAINT "FK_order_items_ticketType" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_event" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_ticketType" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "FK_tickets_order" FOREIGN KEY ("orderReference") REFERENCES "orders"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_order"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_ticketType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "FK_tickets_event"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_ticketType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP CONSTRAINT "FK_order_items_order"`,
    );
    await queryRunner.query(`DROP TABLE "tickets"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
  }
}

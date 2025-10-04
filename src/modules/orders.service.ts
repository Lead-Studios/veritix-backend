import { Injectable, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Order } from "./entities/order.entity";
import { User } from "./entities/user.entity";
import { Ticket } from "./entities/ticket.entity";
import { Payment } from "./entities/payment.entity";
import { Escrow } from "./entities/escrow.entity";

@Injectable()
export class OrdersService {
  constructor(private dataSource: DataSource) {}

  /**
   * Create an order: reserve ticket, create payment record (status HELD), create escrow record
   */
  async createOrder(buyerId: string, ticketId: string, amount: number): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userRepo = queryRunner.manager.getRepository(User);
      const ticketRepo = queryRunner.manager.getRepository(Ticket);
      const orderRepo = queryRunner.manager.getRepository(Order);
      const paymentRepo = queryRunner.manager.getRepository(Payment);
      const escrowRepo = queryRunner.manager.getRepository(Escrow);

      const buyer = await userRepo.findOne({ where: { id: buyerId } });
      if (!buyer) throw new BadRequestException("Buyer not found");

      const ticket = await ticketRepo.findOne({ where: { id: ticketId }, relations: ["organizer"] });
      if (!ticket) throw new BadRequestException("Ticket not found or unavailable");
      if (ticket.status !== "available") throw new BadRequestException("Ticket not available");

      // mark ticket as sold (logical reservation)
      ticket.status = "sold";
      await ticketRepo.save(ticket);

      // create order
      const order = orderRepo.create({
        buyer,
        ticket,
        amount,
        status: "paid", // payment is captured in the sense customer paid, but funds are HELD
      });
      await orderRepo.save(order);

      // create payment record (held)
      const payment = paymentRepo.create({
        order,
        providerPaymentId: `PROV_${Date.now()}`, // replace with real provider id
        amount,
        status: "held",
      });
      await paymentRepo.save(payment);

      // create escrow record
      const escrow = escrowRepo.create({
        order,
        beneficiary: ticket.organizer,
        amount,
        status: "holding",
      });
      await escrowRepo.save(escrow);

      // attach payment + escrow to order and save
      order.payment = payment;
      order.escrow = escrow;
      await orderRepo.save(order);

      await queryRunner.commitTransaction();
      return order;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}

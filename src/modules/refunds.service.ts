import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Refund } from "./entities/refund.entity";
import { Order } from "./entities/order.entity";
import { Ticket } from "./entities/ticket.entity";
import { Payment } from "./entities/payment.entity";
import { User } from "./entities/user.entity";

@Injectable()
export class RefundsService {
  constructor(private ds: DataSource) {}

  /**
   * Issue a refund for an order.
   * Rules (example):
   * - Only organizer of the ticket can issue refund (you can add admin, support roles)
   * - Refund allowed only if payment was held or captured but not already refunded
   */
  async issueRefund(orderId: string, organizerId: string, reason?: string): Promise<Refund> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const orderRepo = qr.manager.getRepository(Order);
      const paymentRepo = qr.manager.getRepository(Payment);
      const refundRepo = qr.manager.getRepository(Refund);
      const userRepo = qr.manager.getRepository(User);
      const ticketRepo = qr.manager.getRepository(Ticket);

      const order = await orderRepo.findOne({ where: { id: orderId }, relations: ["ticket", "payment"] });
      if (!order) throw new NotFoundException("Order not found");

      const organizer = await userRepo.findOne({ where: { id: organizerId } });
      if (!organizer) throw new NotFoundException("Organizer not found");

      // permission: only organizer of ticket can issue refund
      if (order.ticket.organizer.id !== organizer.id) {
        throw new ForbiddenException("Only the organizer can issue refunds for this ticket");
      }

      if (order.status === "refunded") {
        throw new BadRequestException("Order already refunded");
      }

      // Simulate external refund via payment provider
      const payment = order.payment;
      if (!payment) throw new BadRequestException("Payment missing");
      if (payment.status === "refunded") throw new BadRequestException("Payment already refunded");

      // call external payment provider to refund -> on success:
      // For demo: we assume refund succeeded

      // create refund record
      const refund = refundRepo.create({
        order,
        issuedBy: organizer,
        amount: payment.amount,
        status: "issued",
      });
      await refundRepo.save(refund);

      // update payment status
      payment.status = "refunded";
      await paymentRepo.save(payment);

      // update escrow if exists
      if (order.escrow) {
        const escrowRepo = qr.manager.getRepository("Escrow");
        await escrowRepo.update({ id: order.escrow.id }, { status: "refunded" });
      }

      // update ticket status to refunded
      const ticket = order.ticket;
      ticket.status = "refunded";
      await ticketRepo.save(ticket);

      // update order status
      order.status = "refunded";
      await orderRepo.save(order);

      await qr.commitTransaction();
      return refund;
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}

import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { Order } from "./entities/order.entity";
import { Escrow } from "./entities/escrow.entity";
import { Payment } from "./entities/payment.entity";
import { Refund } from "./entities/refund.entity";

@Injectable()
export class EscrowService {
  constructor(private ds: DataSource) {}

  /**
   * Release escrow - called when ticket validated.
   * This transaction:
   * - verifies order & escrow states
   * - simulates transferring funds to beneficiary
   * - marks payment as captured and escrow as released
   * - marks order status as released
   */
  async releaseEscrow(orderId: string, triggeredById?: string): Promise<{ order: Order; escrow: Escrow }> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const orderRepo = qr.manager.getRepository(Order);
      const escrowRepo = qr.manager.getRepository(Escrow);
      const paymentRepo = qr.manager.getRepository(Payment);
      const ticketRepo = qr.manager.getRepository("Ticket");

      const order = await orderRepo.findOne({ where: { id: orderId }, relations: ["escrow", "payment", "ticket"] });
      if (!order) throw new NotFoundException("Order not found");

      const escrow = order.escrow;
      if (!escrow) throw new BadRequestException("Escrow not found for order");
      if (escrow.status !== "holding") throw new BadRequestException("Escrow not in holding state");

      // Ensure ticket is validated before releasing - in your system this would be more elaborate.
      const ticket = order.ticket;
      if (!ticket) throw new BadRequestException("Ticket missing");
      if (ticket.status !== "validated") {
        throw new BadRequestException("Ticket has not been validated; cannot release escrow");
      }

      // Simulate external provider capture/transfer
      // TODO: integrate Stripe/Paystack capture or send to organizer payout
      const payment = order.payment;
      if (!payment) throw new BadRequestException("Payment record missing");

      // Update payment status -> captured
      payment.status = "captured";
      await paymentRepo.save(payment);

      // Update escrow status -> released
      escrow.status = "released";
      await escrowRepo.save(escrow);

      // Update order status
      order.status = "released";
      await orderRepo.save(order);

      await qr.commitTransaction();
      return { order, escrow };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}

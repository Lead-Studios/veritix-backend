import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Ticket } from '../tickets/entities/ticket.entity';
import { TicketType } from '../ticket-types/entities/ticket-type.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from '../orders/enums/order-status.enum';
import { StellarService } from '../stellar/stellar.service';
import * as StellarSdk from '@stellar/stellar-sdk';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketType)
    private readonly ticketTypeRepo: Repository<TicketType>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly stellarService: StellarService,
  ) {}

  // Issue #614 — POST /admin/orders/:id/refund
  async refundOrder(orderId: string, reason: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['tickets'],
    });

    if (!order) throw new NotFoundException(`Order ${orderId} not found`);
    if (order.status !== OrderStatus.PAID)
      throw new BadRequestException(`Order is not PAID (status: ${order.status})`);

    for (const ticket of order.tickets ?? []) {
      await this.ticketRepo.update(ticket.id, { status: 'CANCELLED' });
      await this.ticketTypeRepo.increment({ id: ticket.ticketTypeId }, 'soldQuantity', -1);
    }

    let refundTxHash: string | null = null;
    if (order.stellarTxHash) {
      const user = await this.userRepo.findOne({ where: { id: order.userId } });
      if (user?.stellarWalletAddress) {
        refundTxHash = await this.sendStellarRefund(
          user.stellarWalletAddress,
          order.totalAmountXLM,
          `refund:${order.stellarMemo}`,
        );
      }
    }

    await this.orderRepo.update(orderId, { status: OrderStatus.REFUNDED, refundTxHash });
    return { orderId, status: OrderStatus.REFUNDED, refundTxHash, reason };
  }

  private async sendStellarRefund(
    destination: string,
    amount: number,
    memo: string,
  ): Promise<string | null> {
    try {
      const server = this.stellarService.getServer();
      const secretKey = process.env.STELLAR_SECRET;
      if (!secretKey) return null;

      const sourceKeypair = StellarSdk.Keypair.fromSecret(secretKey);
      const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());

      const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.stellarService.getNetworkPassphrase(),
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination,
            asset: StellarSdk.Asset.native(),
            amount: amount.toFixed(7),
          }),
        )
        .addMemo(StellarSdk.Memo.text(memo.substring(0, 28)))
        .setTimeout(30)
        .build();

      tx.sign(sourceKeypair);
      const result = await server.submitTransaction(tx);
      return result.hash;
    } catch {
      return null;
    }
  }

  // Issue #615 — GET /admin/events/:id/analytics
  async getEventAnalytics(eventId: string) {
    const ticketTypes = await this.ticketTypeRepo.find({ where: { eventId } });
    if (!ticketTypes.length) throw new NotFoundException(`Event ${eventId} not found`);

    const salesByType = ticketTypes.map((tt) => ({
      name: tt.name,
      sold: tt.soldQuantity,
      remaining: tt.totalQuantity - tt.soldQuantity,
    }));

    const totalRevenue = ticketTypes.reduce(
      (sum, tt) => sum + Number(tt.price) * tt.soldQuantity,
      0,
    );

    const tickets = await this.ticketRepo.find({ where: { eventId } });
    const totalScanned = tickets.filter((t) => t.status === 'USED').length;
    const scanRate = tickets.length ? Math.round((totalScanned / tickets.length) * 100) : 0;

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const velocity: Record<string, number> = {};
    for (const ticket of tickets) {
      if (ticket.createdAt >= since) {
        const day = ticket.createdAt.toISOString().split('T')[0];
        velocity[day] = (velocity[day] ?? 0) + 1;
      }
    }

    return {
      eventId,
      salesByType,
      totalRevenueUSD: totalRevenue,
      scanStats: { totalScanned, scanRate },
      salesVelocity: Object.entries(velocity)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // Issue #616 — GET /admin/stellar/transactions
  async getRecentTransactions(limit = 20) {
    const clampedLimit = Math.min(50, Math.max(1, limit));
    const address = this.stellarService.getReceivingAddress();
    if (!address) throw new BadRequestException('STELLAR_RECEIVING_ADDRESS not configured');

    const server = this.stellarService.getServer();
    const records = await server
      .transactions()
      .forAccount(address)
      .limit(clampedLimit)
      .order('desc')
      .call();

    const txs = await Promise.all(
      records.records.map(async (tx) => {
        const memo = tx.memo ?? null;
        let matchedOrderId: string | null = null;

        if (memo) {
          const order = await this.orderRepo.findOne({
            where: { stellarMemo: memo },
            select: ['id'],
          });
          matchedOrderId = order?.id ?? null;
        }

        const ops = await tx.operations();
        const paymentOp = ops.records.find((op) => op.type === 'payment') as
          | { from: string; amount: string }
          | undefined;

        return {
          txHash: tx.hash,
          from: paymentOp?.from ?? null,
          memo,
          amount: paymentOp?.amount ?? null,
          confirmedAt: tx.created_at,
          matchedOrderId,
        };
      }),
    );

    return txs;
  }
}

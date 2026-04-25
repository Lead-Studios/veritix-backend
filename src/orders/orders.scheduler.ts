import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, LessThan, Repository } from 'typeorm';
import { OrderConfig } from './order.config';
import { Order } from './orders.entity';
import { TicketTypesService } from 'src/ticket-types/ticket-types.service';
import { OrderStatus } from './enums/order-status.enum';

export interface ExpiryRunSummary {
  checkedAt: Date;
  expiredCount: number;
  ticketsReleased: number;
  failedOrderIds: string[];
}

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly ticketTypeService: TicketTypesService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async handleOrderExpiry(): Promise<ExpiryRunSummary> {
    const checkedAt = new Date();
    this.logger.log('Order expiry job started');

    const expiredOrders = await this.findExpiredOrders(checkedAt);

    if (expiredOrders.length === 0) {
      this.logger.log('Order expiry job: no expired orders found');
      return { checkedAt, expiredCount: 0, ticketsReleased: 0, failedOrderIds: [] };
    }

    this.logger.log(`Found ${expiredOrders.length} expired order(s) — processing`);

    let ticketsReleased = 0;
    const failedOrderIds: string[] = [];

    for (const order of expiredOrders) {
      try {
        const released = await this.cancelAndRelease(order);
        ticketsReleased += released;
      } catch (err) {
        failedOrderIds.push(order.id);
        this.logger.error(
          `Failed to expire order ${order.id}: ${(err as Error).message}`,
          (err as Error).stack,
        );
      }
    }

    const summary: ExpiryRunSummary = {
      checkedAt,
      expiredCount: expiredOrders.length - failedOrderIds.length,
      ticketsReleased,
      failedOrderIds,
    };

    this.logger.log(
      `Order expiry job finished — ` +
        `expired: ${summary.expiredCount}, ` +
        `tickets released: ${summary.ticketsReleased}, ` +
        `failed: ${failedOrderIds.length}` +
        (failedOrderIds.length ? ` [${failedOrderIds.join(', ')}]` : ''),
    );

    return summary;
  }

  async findExpiredOrders(asOf: Date): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: LessThan(asOf),
      },
      relations: ['items', 'items.ticketType'],
    });
  }

  async cancelAndRelease(order: Order): Promise<number> {
    let released = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const item of order.items ?? []) {
        await this.ticketTypeService.releaseTickets(
          item.ticketType.id,
          item.quantity,
          manager.queryRunner,
        );
        released += item.quantity;
      }

      await manager.update(Order, order.id, {
        status: OrderStatus.CANCELLED,
      });
    });

    return released;
  }

  computeExpiresAt(from: Date = new Date()): Date {
    const minutes = this.config.get<OrderConfig>('order')?.expiryMinutes ?? 15;
    return new Date(from.getTime() + minutes * 60 * 1_000);
  }
}

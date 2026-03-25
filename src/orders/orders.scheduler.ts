import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { LessThan, Repository } from 'typeorm';
import { OrderConfig } from './order.config';
import { Order } from './orders.entity';
import { TicketTypeService } from 'src/tickets-inventory/services/ticket-type.service';
import { OrderStatus } from './enums/order-status.enum';

/** Shape of the summary emitted after each run. */
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
    private readonly ticketTypeService: TicketTypeService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Finds all PENDING orders whose `expiresAt` is in the past, releases
   * their reserved inventory, and marks them CANCELLED.
   *
   * Errors from individual orders are caught and isolated so one bad row
   * never aborts the rest of the batch.
   */
  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'order-expiry-cleanup' })
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

    // Process each order independently so one failure doesn't block others.
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

  /** Query the DB for all PENDING orders past their expiry timestamp. */
  async findExpiredOrders(asOf: Date): Promise<Order[]> {
    return this.orderRepo.find({
      where: {
        status: OrderStatus.PENDING,
        expiresAt: LessThan(asOf),
      },
      relations: ['items', 'items.ticketType'],
    });
  }

  /**
   * Release inventory for a single order, then mark it CANCELLED.
   * Returns the number of tickets released.
   */
  async cancelAndRelease(order: Order): Promise<number> {
    let released = 0;

    // Release each line item back to its ticket-type pool.
    for (const item of order.items ?? []) {
      await this.ticketTypeService.releaseTickets(
        item.ticketType.id,
        item.quantity,
      );
      released += item.quantity;
    }

    // Persist the status change. Use a targeted update to avoid
    // overwriting concurrent writes on other columns.
    await this.orderRepo.update(order.id, {
      status: OrderStatus.CANCELLED,
    });

    return released;
  }

  /**
   * Compute the expiry timestamp for a new order.
   *
   * Reads `order.expiryMinutes` from config (default 15) so the window
   * is never hardcoded in business logic.
   */
  computeExpiresAt(from: Date = new Date()): Date {
    const minutes =
      this.config.get<OrderConfig>('order')?.expiryMinutes ?? 15;
    return new Date(from.getTime() + minutes * 60 * 1_000);
  }
}
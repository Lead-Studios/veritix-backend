import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import {
  CreateOrderInput,
  CreateOrderResult,
  OrderError,
  OrderErrorCode,
} from './dto/order.dto';
import { OrderConfig } from './order.config';
import { Order, OrderItem } from './orders.entity';
import { TicketTypeService } from 'src/tickets-inventory/services/ticket-type.service';
import { OrderStatus } from './enums/order-status.enum';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly ticketTypeService: TicketTypeService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  // ------------------------------------------------------------------
  // createOrder
  // ------------------------------------------------------------------

  /**
   * Validate inventory, soft-reserve tickets, and persist the order.
   *
   * DOES NOT issue tickets — that happens in Issue 10 after Stellar
   * payment confirmation.
   *
   * Steps:
   *  1. Guard: at least one item, all quantities > 0.
   *  2. Load each TicketType and check availability.
   *  3. Open a DB transaction:
   *     a. Insert Order row with PENDING status and computed expiresAt.
   *     b. Insert OrderItem rows with snapshotted prices.
   *     c. Call TicketTypeService.reserveTickets per item.
   *  4. Return order + stellarMemo.
   */
  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const { userId, eventId, items } = input;

    if (!items || items.length === 0) {
      throw new OrderError('Order must contain at least one item', OrderErrorCode.EMPTY_ORDER);
    }

    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new OrderError(
          `Invalid quantity ${item.quantity} for ticketType ${item.ticketTypeId}`,
          OrderErrorCode.INVALID_QUANTITY,
        );
      }
    }

    // Load ticket types and validate inventory before opening a transaction.
    const ticketTypes = await Promise.all(
      items.map((item) =>
        this.ticketTypeService
          .findById(item.ticketTypeId)
          .then((tt) => {
            if (!tt) {
              throw new OrderError(
                `TicketType ${item.ticketTypeId} not found`,
                OrderErrorCode.TICKET_TYPE_NOT_FOUND,
              );
            }
            if (tt.totalQuantity < item.quantity) {
              throw new OrderError(
                `Insufficient inventory for ticketType ${item.ticketTypeId}: ` +
                  `requested ${item.quantity}, available ${tt.totalQuantity}`,
                OrderErrorCode.INSUFFICIENT_INVENTORY,
              );
            }
            return tt;
          }),
      ),
    );

    const expiryMinutes =
      this.config.get<OrderConfig>('order')?.expiryMinutes ?? 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1_000);
    const stellarMemo = this.generateMemo();

    // Compute totals from snapshotted prices.
    let totalAmountXLM = 0;
    let totalAmountUSD = 0;

    const orderItems: Partial<OrderItem>[] = items.map((item, idx) => {
      const tt = ticketTypes[idx];
      const subtotalXLM = tt.price * item.quantity;
      const subtotalUSD = tt.price * item.quantity;
      totalAmountXLM += subtotalXLM;
      totalAmountUSD += subtotalUSD;

      return {
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPriceXLM: tt.price,
        subtotalXLM,
      };
    });

    // Run everything inside a transaction so a failed reservation rolls back
    // the order row automatically.
    const order = await this.dataSource.transaction(async (manager) => {
      const savedOrder = await manager.save(
        manager.create(Order, {
          userId,
          eventId,
          status: OrderStatus.PENDING,
          totalAmountXLM,
          totalAmountUSD,
          stellarMemo,
          expiresAt,
          paidAt: null,
          stellarTxHash: null,
          metadata: null,
        }),
      );

      const itemEntities = orderItems.map((item) =>
        manager.create(OrderItem, { ...item, orderId: savedOrder.id }),
      );
      savedOrder.items = await manager.save(itemEntities);

      // Soft-reserve inventory. If any reservation fails the transaction
      // rolls back and the order is never persisted.
      for (const item of items) {
        await this.ticketTypeService.reserveTickets(
          item.ticketTypeId,
          item.quantity,
        );
      }

      return savedOrder;
    });

    this.logger.log(
      `Order ${order.id} created for user ${userId} — ` +
        `${items.length} item(s), ${totalAmountXLM} XLM, memo=${stellarMemo}`,
    );

    return { order, stellarMemo };
  }

  async findById(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.ticketType'],
    });

    if (!order) {
      throw new OrderError(`Order ${orderId} not found`, OrderErrorCode.ORDER_NOT_FOUND);
    }

    return order;
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { userId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Cancel a PENDING order that has not yet expired.
   *
   * Inventory is NOT released here — the scheduler (Issue 9) handles
   * bulk release on expiry. Manual cancellation is a soft-cancel that
   * sets status to CANCELLED; the scheduler's next run will release
   * inventory for any CANCELLED orders it encounters, or you may call
   * TicketTypeService.releaseTickets directly in a follow-up.
   */
  async cancelOrder(orderId: string): Promise<Order> {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new OrderError(
        `Order ${orderId} cannot be cancelled — status is ${order.status}`,
        OrderErrorCode.ORDER_NOT_CANCELLABLE,
      );
    }

    if (order.isExpired()) {
      throw new OrderError(
        `Order ${orderId} has already expired`,
        OrderErrorCode.ORDER_NOT_CANCELLABLE,
      );
    }

    await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED });
    order.status = OrderStatus.CANCELLED;

    this.logger.log(`Order ${orderId} manually cancelled`);
    return order;
  }

  /**
   * Generate a Stellar-compatible memo (≤ 28 chars, URL-safe).
   * Format: VTX-<10 random hex chars>  e.g. "VTX-3f9a2b1c4d"
   */
  private generateMemo(): string {
    return `VTX-${randomBytes(5).toString('hex')}`;
  }
}
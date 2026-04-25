import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import {
  CreateOrderDto,
  CreateOrderResult,
} from './dto/create-order.dto';
import { OrderConfig } from './order.config';
import { Order, OrderItem } from './orders.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';
import { TicketTypesService } from 'src/ticket-types/ticket-types.service';
import { WaitlistService } from 'src/events/waitlist.service';
import { OrderStatus } from './enums/order-status.enum';
import { User } from 'src/users/entities/user.entity';
import { UserRole } from 'src/users/enums/user-role.enum';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
    private readonly ticketTypeService: TicketTypesService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly waitlistService: WaitlistService,
  ) {}

  async create(dto: CreateOrderDto, user: User): Promise<CreateOrderResult> {
    const { eventId, items } = dto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    const ticketTypes = await Promise.all(
      items.map(async (item) => {
        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          throw new BadRequestException(
            `Invalid quantity ${item.quantity} for ticketType ${item.ticketTypeId}`,
          );
        }

        const ticketType = await this.ticketTypeService.findOne(item.ticketTypeId);
        if (!ticketType) {
          throw new NotFoundException(`TicketType ${item.ticketTypeId} not found`);
        }

        if (ticketType.soldQuantity + item.quantity > ticketType.totalQuantity) {
          throw new BadRequestException(
            `Insufficient inventory for ticketType ${item.ticketTypeId}: requested ${item.quantity}, available ${ticketType.totalQuantity - ticketType.soldQuantity}`,
          );
        }

        return ticketType;
      }),
    );

    const orderId = randomUUID();
    const stellarMemo = orderId.slice(0, 8);
    const expiryMinutes = this.config.get<OrderConfig>('order')?.expiryMinutes ?? 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60_000);

    let totalAmountUSD = 0;
    let totalAmountXLM = 0;

    const orderItems = items.map((item, idx) => {
      const ticketType = ticketTypes[idx];
      const unitPrice = Number(ticketType.price);
      const subtotal = unitPrice * item.quantity;
      totalAmountUSD += subtotal;
      totalAmountXLM += subtotal;

      return {
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPriceUSD: unitPrice,
        subtotalUSD: subtotal,
      };
    });

    const order = await this.dataSource.transaction(async (manager) => {
      const orderData: Partial<Order> = {
        id: orderId,
        userId: user.id,
        eventId,
        status: OrderStatus.PENDING,
        totalAmountUSD,
        totalAmountXLM,
        stellarMemo,
        stellarTxHash: null,
        refundTxHash: null,
        expiresAt,
        paidAt: null,
      };

      const savedOrder = await manager.save(
        manager.create(Order, orderData),
      );

      const itemsToSave = orderItems.map((item) =>
        manager.create(OrderItem, {
          ...item,
          orderId: savedOrder.id,
        }),
      );

      savedOrder.items = await manager.save(itemsToSave);

      for (const item of items) {
        await this.ticketTypeService.reserveTickets(
          item.ticketTypeId,
          item.quantity,
          manager.queryRunner,
        );
      }

      return savedOrder;
    });

    this.logger.log(
      `Order ${order.id} created for user ${user.id} — ${items.length} item(s), ${totalAmountXLM} XLM, memo=${stellarMemo}`,
    );

    return {
      order,
      stellarMemo,
      amountXLM: totalAmountXLM,
    };
  }

  async findById(orderId: string, user: User): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.ticketType'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    return order;
  }

  async findByUser(userId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { userId },
      relations: ['items', 'items.ticketType'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderTickets(orderId: string, user: User) {
    await this.findById(orderId, user);

    const tickets = await this.ticketRepo.find({
      where: { orderReference: orderId },
      relations: ['ticketType', 'event'],
      order: { createdAt: 'ASC' },
    });

    return tickets.map((ticket) => ({
      id: ticket.id,
      attendeeName: ticket['attendeeName'],
      attendeeEmail: ticket['attendeeEmail'],
      status: ticket.status,
      ticketTypeName: ticket.ticketType?.name,
      eventTitle: ticket.event?.title,
      eventDate: ticket.event?.eventDate,
    }));
  }

  async cancel(id: string, user: User): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    if (order.userId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Order ${id} cannot be cancelled — status is ${order.status}`);
    }

    await this.dataSource.transaction(async (manager) => {
      for (const item of order.items) {
        await this.ticketTypeService.releaseTickets(
          item.ticketTypeId,
          item.quantity,
          manager.queryRunner,
        );
      }

      await manager.update(Order, id, {
        status: OrderStatus.CANCELLED,
      });
    });

    this.logger.log(`Order ${id} cancelled by user ${user.id} (${user.role}) — inventory released`);

    await this.waitlistService.notifyNext(order.eventId, 1);

    order.status = OrderStatus.CANCELLED;
    return order;
  }
}

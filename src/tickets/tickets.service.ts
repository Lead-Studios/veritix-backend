import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';
import { TicketTransfer } from './entities/ticket-transfer.entity';

export interface TicketQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    @InjectRepository(TicketTransfer)
    private readonly ticketTransferRepository: Repository<TicketTransfer>,
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async findByUser(userId: string, query: TicketQuery) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));

    const qb = this.ticketRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.event', 'event')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .where('ticket.userId = :userId', { userId });

    if (query.status) {
      qb.andWhere('ticket.status = :status', { status: query.status });
    }

    const [tickets, total] = await qb
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const data = tickets.map((ticket) => ({
      id: ticket.id,
      status: ticket.status,
      eventTitle: ticket.event?.title,
      eventDate: ticket.event?.eventDate,
      ticketTypeName: ticket.ticketType?.name,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    }));

    return {
      data,
      page,
      pageSize,
      total,
    };
  }

  public async findOne(id: string) {
    return this.ticketRepository.findOne({
      where: { id },
      relations: ['event', 'ticketType', 'order'],
    });
  }

  public async refundTicket(ticketId: string): Promise<void> {
    const ticket = await this.findOne(ticketId);
    
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.status === 'REFUNDED') {
      throw new BadRequestException('Ticket is already refunded');
    }


  public async transfer(ticketId: string, fromUserId: string, toUserId: string, resalePriceUSD?: number): Promise<void> {
    const ticket = await this.findOne(ticketId);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.userId !== fromUserId) {
      throw new BadRequestException('Ticket does not belong to the user');
    }

    if (ticket.status !== 'ACTIVE') {
      throw new BadRequestException('Ticket is not active');
    }

    // Check resale price cap
    if (ticket.ticketType?.maxResalePriceUSD && resalePriceUSD && resalePriceUSD > ticket.ticketType.maxResalePriceUSD) {
      throw new BadRequestException('Resale price exceeds the maximum allowed');
    }

    // Create transfer record
    const transfer = this.ticketTransferRepository.create({
      ticketId,
      fromUserId,
      toUserId,
      resalePriceUSD,
      status: 'COMPLETED',
    });
    await this.ticketTransferRepository.save(transfer);

    // Update ticket owner
    ticket.userId = toUserId;
    await this.ticketRepository.save(ticket);
  }
    ticket.status = 'REFUNDED';
    await this.ticketRepository.save(ticket);
  }
}

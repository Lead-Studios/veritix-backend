import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

export interface TicketQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
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

    ticket.status = 'REFUNDED';
    await this.ticketRepository.save(ticket);
  }
}

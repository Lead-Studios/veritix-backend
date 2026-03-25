import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TicketEntity, TicketStatus } from '../entities/ticket.entity';

@Injectable()
export class TicketRepository extends Repository<TicketEntity> {
  constructor(private dataSource: DataSource) {
    super(TicketEntity, dataSource.createEntityManager());
  }

  /**
   * Find ticket by ID
   */
  async findById(id: string): Promise<TicketEntity | null> {
    return this.findOne({
      where: { id },
    });
  }

  /**
   * Find ticket by code
   */
  async findByCode(code: string): Promise<TicketEntity | null> {
    return this.findOne({
      where: { code },
    });
  }

  /**
   * Check if ticket has been used
   */
  async isAlreadyUsed(ticketId: string): Promise<boolean> {
    const ticket = await this.findById(ticketId);
    return ticket ? ticket.status === TicketStatus.USED : false;
  }

  /**
   * Check if ticket is expired
   */
  async isExpired(ticketId: string): Promise<boolean> {
    const ticket = await this.findById(ticketId);
    if (!ticket) return false;
    return new Date() > ticket.expiresAt;
  }

  /**
   * Mark ticket as used
   */
  async markAsUsed(ticketId: string): Promise<TicketEntity> {
    const ticket = await this.findById(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    ticket.usageCount += 1;
    if (ticket.usageCount >= ticket.maxUses) {
      ticket.status = TicketStatus.USED;
    }

    return this.save(ticket);
  }

  /**
   * Get paginated list of tickets
   */
  async getPaginatedTickets(
    page: number = 1,
    limit: number = 50,
    status?: TicketStatus,
  ) {
    const query = this.createQueryBuilder('ticket');

    if (status) {
      query.where('ticket.status = :status', { status });
    }

    const [data, total] = await query
      .orderBy('ticket.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get active tickets count
   */
  async getActiveTicketsCount(): Promise<number> {
    return this.count({
      where: { status: TicketStatus.ACTIVE },
    });
  }

  /**
   * Get used tickets count
   */
  async getUsedTicketsCount(): Promise<number> {
    return this.count({
      where: { status: TicketStatus.USED },
    });
  }
}

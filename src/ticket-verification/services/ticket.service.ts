import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketRepository } from '../repositories/ticket.repository';
import { CreateTicketDto, UpdateTicketDto } from '../dto/ticket.dto';
import { TicketEntity, TicketStatus } from '../entities/ticket.entity';

@Injectable()
export class TicketService {
  constructor(private readonly ticketRepository: TicketRepository) {}

  /**
   * Create a new ticket
   */
  async createTicket(createTicketDto: CreateTicketDto): Promise<TicketEntity> {
    // Validate expiry date is in the future
    if (new Date(createTicketDto.expiresAt) <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }

    // Check if code already exists
    const existingTicket = await this.ticketRepository.findByCode(createTicketDto.code);
    if (existingTicket) {
      throw new BadRequestException('Ticket code already exists');
    }

    const ticket = this.ticketRepository.create({
      ...createTicketDto,
      expiresAt: new Date(createTicketDto.expiresAt),
    });

    return this.ticketRepository.save(ticket);
  }

  /**
   * Get ticket by ID
   */
  async getTicket(id: string): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  /**
   * Get ticket by code
   */
  async getTicketByCode(code: string): Promise<TicketEntity> {
    const ticket = await this.ticketRepository.findByCode(code);
    if (!ticket) {
      throw new NotFoundException(`Ticket with code ${code} not found`);
    }
    return ticket;
  }

  /**
   * Get all tickets with pagination
   */
  async getAllTickets(page: number = 1, limit: number = 50, status?: TicketStatus) {
    return this.ticketRepository.getPaginatedTickets(page, limit, status);
  }

  /**
   * Update ticket
   */
  async updateTicket(id: string, updateTicketDto: UpdateTicketDto): Promise<TicketEntity> {
    const ticket = await this.getTicket(id);

    if (updateTicketDto.expiresAt) {
      if (new Date(updateTicketDto.expiresAt) <= new Date()) {
        throw new BadRequestException('Expiry date must be in the future');
      }
      ticket.expiresAt = new Date(updateTicketDto.expiresAt);
    }

    Object.assign(ticket, updateTicketDto);
    return this.ticketRepository.save(ticket);
  }

  /**
   * Delete ticket
   */
  async deleteTicket(id: string): Promise<void> {
    const ticket = await this.getTicket(id);
    await this.ticketRepository.remove(ticket);
  }

  /**
   * Get ticket statistics
   */
  async getStatistics() {
    const activeCount = await this.ticketRepository.getActiveTicketsCount();
    const usedCount = await this.ticketRepository.getUsedTicketsCount();
    const total = activeCount + usedCount;

    return {
      total,
      active: activeCount,
      used: usedCount,
      usageRate: total > 0 ? (usedCount / total * 100).toFixed(2) : 0,
    };
  }
}

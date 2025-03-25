import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from 'src/tickets/entities/ticket.entity';
import { ResolveTicketDto } from '../dto/resolve-ticket.dto';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
  ) {}

  async resolveTicket(resolveTicketDto: ResolveTicketDto): Promise<Ticket> {
    try {
      this.logger.log(`Resolving ticket with ID: ${resolveTicketDto.ticketId}`);
      
      // Find the ticket
      const ticket = await this.ticketsRepository.findOne({
        where: { id: resolveTicketDto.ticketId }
      });
      
      if (!ticket) {
        throw new NotFoundException(`Ticket with ID ${resolveTicketDto.ticketId} not found`);
      }
      
      // Process the ticket resolution
      // For this implementation, we'll add a transactionId to mark it as resolved
      // In a real app, this would likely involve more complex logic
      ticket.transactionId = `RESOLVED-${Date.now()}`;
      
      // Add notes if provided (this would require extending the Ticket entity with a notes field)
      // For now, we'll just use the existing fields
      
      // Save the updated ticket
      return await this.ticketsRepository.save(ticket);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to resolve ticket: ${error.message}`, error.stack);
      throw error;
    }
  }
} 
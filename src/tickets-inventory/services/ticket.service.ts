import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketResponseDto } from '../dto/ticket.response.dto';
import { TicketTypeService } from './ticket-type.service';
import { StellarService } from '../../stellar/stellar.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../orders/orders.entity';

@Injectable()
export class TicketService {
  private readonly ticketRepository: Repository<Ticket>;
  private readonly ticketTypeService: TicketTypeService;

  constructor(
    @InjectRepository(Ticket)
    ticketRepository: Repository<Ticket>,
    ticketTypeService: TicketTypeService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly stellarService: StellarService,
  ) {
    this.ticketRepository = ticketRepository;
    this.ticketTypeService = ticketTypeService;
  }
  async createTickets(
    eventId: string,
    createTicketDto: CreateTicketDto,
    quantity: number = 1,
  ): Promise<TicketResponseDto[]> {
    const ticketType = await this.ticketTypeService.findByIdEntity(
      createTicketDto.ticketTypeId,
    );

    if (ticketType.eventId !== eventId) {
      throw new BadRequestException(
        'Ticket type does not belong to this event',
      );
    }

    if (!ticketType.canPurchase(quantity)) {
      throw new BadRequestException(
        `Not enough tickets available. Remaining: ${ticketType.getRemainingQuantity()}`,
      );
    }

    await this.ticketTypeService.reserveTickets(
      createTicketDto.ticketTypeId,
      quantity,
    );

    const tickets = Array.from({ length: quantity }, () =>
      this.ticketRepository.create({
        ...createTicketDto,
        eventId,
        status: TicketStatus.ISSUED,
      }),
    );

    const saved = await this.ticketRepository.save(tickets);
    return saved.map((t) => this.mapToResponseDto(t));
  }

  async findById(id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    return this.mapToResponseDto(ticket);
  }

  async findByQrCode(qrCode: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { qrCode },
      relations: ['ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with QR code ${qrCode} not found`);
    }

    return this.mapToResponseDto(ticket);
  }

  async findByEvent(eventId: string): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketRepository.find({
      where: { eventId },
      relations: ['ticketType'],
      order: { createdAt: 'DESC' },
    });

    return tickets.map((t) => this.mapToResponseDto(t));
  }

  async findByTicketType(ticketTypeId: string): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketRepository.find({
      where: { ticketTypeId },
      relations: ['ticketType'],
      order: { createdAt: 'ASC' },
    });

    return tickets.map((t) => this.mapToResponseDto(t));
  }

  async findByOrderReference(
    orderReference: string,
  ): Promise<TicketResponseDto[]> {
    const tickets = await this.ticketRepository.find({
      where: { orderReference },
      relations: ['ticketType'],
      order: { createdAt: 'ASC' },
    });

    return tickets.map((t) => this.mapToResponseDto(t));
  }

  /**
   * Scan a ticket (mark as scanned)
   */
  async scanTicket(id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (!ticket.canBeScanned()) {
      throw new BadRequestException(
        `Cannot scan ticket with status: ${ticket.status}`,
      );
    }

    ticket.status = TicketStatus.SCANNED;
    ticket.scannedAt = new Date();

    const updated = await this.ticketRepository.save(ticket);
    return this.mapToResponseDto(updated);
  }

  async scanByQrCode(qrCode: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { qrCode },
      relations: ['ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with QR code ${qrCode} not found`);
    }

    return this.scanTicket(ticket.id);
  }

  async refundTicket(id: string): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['ticketType'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    if (ticket.status === TicketStatus.REFUNDED) {
      throw new BadRequestException('Ticket is already refunded');
    }

    // Process refund on Stellar if it was a Stellar payment
    if (ticket.orderReference) {
      const order = await this.orderRepository.findOne({ where: { id: ticket.orderReference } });
      if (order && order.stellarTxHash) {
        try {
          const refundAmount = ticket.ticketType.price; // Refund only this ticket's price
          const destination = order.buyerStellarAddress || 'UNKNOWN'; // Needs actual buyer address

          if (destination === 'UNKNOWN') {
            throw new BadRequestException('Cannot refund: buyerStellarAddress not set on the Order');
          }

          const refundHash = await this.stellarService.sendRefund(
            destination,
            refundAmount, // Make sure ticketType.price is available
            order.id
          );
          order.refundTxHash = refundHash;
          await this.orderRepository.save(order);
        } catch (error) {
          throw new BadRequestException(`Stellar refund failed: ${error.message}`);
        }
      }
    }

    // Release ticket back to inventory
    await this.ticketTypeService.releaseTickets(ticket.ticketTypeId, 1);

    ticket.status = TicketStatus.REFUNDED;
    ticket.refundedAt = new Date();

    const updated = await this.ticketRepository.save(ticket);
    return this.mapToResponseDto(updated);
  }

  async getEventStats(eventId: string): Promise<{
    totalTickets: number;
    issued: number;
    scanned: number;
    refunded: number;
    cancelled: number;
  }> {
    const tickets = await this.ticketRepository.find({
      where: { eventId },
    });

    return {
      totalTickets: tickets.length,
      issued: tickets.filter((t) => t.status === TicketStatus.ISSUED).length,
      scanned: tickets.filter((t) => t.status === TicketStatus.SCANNED).length,
      refunded: tickets.filter((t) => t.status === TicketStatus.REFUNDED)
        .length,
      cancelled: tickets.filter((t) => t.status === TicketStatus.CANCELLED)
        .length,
    };
  }

  private mapToResponseDto(ticket: Ticket): TicketResponseDto {
    return {
      id: ticket.id,
      qrCode: ticket.qrCode,
      status: ticket.status,
      orderReference: ticket.orderReference,
      attendeeEmail: ticket.attendeeEmail,
      attendeeName: ticket.attendeeName,
      metadata: ticket.metadata,
      ticketTypeId: ticket.ticketTypeId,
      eventId: ticket.eventId,
      scannedAt: ticket.scannedAt,
      refundedAt: ticket.refundedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}

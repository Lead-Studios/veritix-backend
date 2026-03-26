import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketResponseDto } from '../dto/ticket.response.dto';
import { TicketTypeService } from './ticket-type.service';
import { QRService } from '../qr.service';
import { StellarService } from '../../stellar/stellar.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from '../../orders/orders.entity';
import { User } from '../../users/entities/event.entity';
import { TicketType } from '../entities/ticket-type.entity';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);
  private readonly ticketRepository: Repository<Ticket>;
  private readonly ticketTypeService: TicketTypeService;

  constructor(
    @InjectRepository(Ticket)
    ticketRepository: Repository<Ticket>,
    ticketTypeService: TicketTypeService,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly stellarService: StellarService,
    private readonly qrService: QRService,
    private readonly dataSource: DataSource,
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

    // Persist tickets first so each gets its auto-generated qrCode UUID
    const tickets = Array.from({ length: quantity }, () =>
      this.ticketRepository.create({
        ...createTicketDto,
        eventId,
        status: TicketStatus.ISSUED,
      }),
    );

    const saved = await this.ticketRepository.save(tickets);

    // Generate QR code images after save so we have the actual qrCode value.
    // Failures are non-fatal — we log and leave qrCodeImage null so ticket
    // creation is never blocked by an image-generation issue.
    const withQR = await Promise.all(
      saved.map(async (ticket) => {
        try {
          ticket.qrCodeImage = await this.qrService.generateQRDataURI(
            ticket.qrCode,
          );
        } catch (err) {
          this.logger.error(
            `QR generation failed for ticket ${ticket.id}: ${
              (err as Error).message
            }`,
            (err as Error).stack,
          );
          ticket.qrCodeImage = null;
        }
        return ticket;
      }),
    );

    const finalSaved = await this.ticketRepository.save(withQR);
    return finalSaved.map((t) => this.mapToResponseDto(t));
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

    let refundHash: string | null = null;
    let order: Order | null = null;

    // Process refund on Stellar if it was a Stellar payment
    if (ticket.orderReference) {
      order = await this.orderRepository.findOne({
        where: { id: ticket.orderReference },
      });

      if (order?.stellarTxHash) {
        const buyer = await this.userRepository.findOne({
          where: { id: order.userId },
        });
        const destinationAddress = buyer?.stellarWalletAddress;

        if (!destinationAddress) {
          throw new BadRequestException(
            'Cannot refund Stellar payment: user.stellarWalletAddress is not set',
          );
        }

        try {
          refundHash = await this.stellarService.sendRefund(
            destinationAddress,
            ticket.ticketType.price.toString(),
            order.id,
          );
        } catch (error) {
          throw new BadRequestException(
            `Stellar refund failed: ${(error as Error).message}`,
          );
        }
      }
    }

    const updated = await this.dataSource.transaction(async (manager) => {
      if (ticket.ticketType.soldQuantity < 1) {
        throw new BadRequestException(
          `Cannot release more tickets than sold. Sold: ${ticket.ticketType.soldQuantity}`,
        );
      }

      const ticketTypeRepo = manager.getRepository(TicketType);
      const releaseResult = await ticketTypeRepo.decrement(
        { id: ticket.ticketTypeId },
        'soldQuantity',
        1,
      );

      if (releaseResult.affected === 0) {
        throw new NotFoundException(
          `TicketType with ID ${ticket.ticketTypeId} not found`,
        );
      }

      ticket.status = TicketStatus.REFUNDED;
      ticket.refundedAt = new Date();

      if (order && refundHash) {
        order.refundTxHash = refundHash;
        await manager.getRepository(Order).save(order);
      }

      return manager.getRepository(Ticket).save(ticket);
    });

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
      qrCodeImage: ticket.qrCodeImage ?? null,
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

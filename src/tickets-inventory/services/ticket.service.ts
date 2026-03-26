import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
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
import { AuditLogService } from '../../admin/services/audit-log.service';
import {
  AdminAuditAction,
  AdminAuditTargetType,
} from '../../admin/entities/admin-audit-log.entity';

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
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
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

  async refundTicket(id: string, actorId?: string): Promise<TicketResponseDto> {
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

    const updated = await this.ticketRepository.save(ticket);

    if (actorId) {
      await this.auditLogService.log(
        actorId,
        AdminAuditAction.MANUAL_REFUND,
        AdminAuditTargetType.TICKET,
        updated.id,
        {
          orderReference: updated.orderReference ?? null,
          ticketTypeId: updated.ticketTypeId,
          refundTxHash: ticket.orderReference
            ? (
                await this.orderRepository.findOne({
                  where: { id: ticket.orderReference },
                })
              )?.refundTxHash ?? null
            : null,
          refundedAt: updated.refundedAt?.toISOString() ?? null,
        },
      );
    }

    return this.mapToResponseDto(updated);
  }

  async cancelTicket(
    id: string,
    user: User,
    reason?: string,
  ): Promise<TicketResponseDto> {
    const ticket = await this.ticketRepository.findOne({
      where: { id },
      relations: ['ticketType', 'event'],
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }

    const isAdmin = user.role === UserRole.ADMIN;
    const isOrganizer = ticket.event?.organizerId === user.id;

    if (!isAdmin && !isOrganizer) {
      throw new ForbiddenException(
        'You do not have permission to cancel this ticket',
      );
    }

    if (ticket.status === TicketStatus.CANCELLED) {
      throw new BadRequestException('Ticket is already cancelled');
    }

    if (ticket.status !== TicketStatus.ISSUED) {
      throw new BadRequestException(
        `Cannot cancel ticket with status: ${ticket.status}`,
      );
    }

    await this.ticketTypeService.releaseTickets(ticket.ticketTypeId, 1);

    ticket.markAsCancelled(reason);

    const updated = await this.ticketRepository.save(ticket);

    this.eventEmitter.emit('ticket.cancelled', {
      ticketId: updated.id,
      eventId: updated.eventId,
      ticketTypeId: updated.ticketTypeId,
      cancelledAt: updated.cancelledAt,
      cancellationReason: updated.cancellationReason,
      cancelledBy: user.id,
    });

    return this.mapToResponseDto(updated);
  }

  /**
   * Returns per-status counts, a grand total, and a scan-rate for the event.
   *
   * Uses a single GROUP BY aggregate query instead of loading every ticket row
   * into memory, keeping this O(1) in database round-trips regardless of
   * ticket volume.
   *
   * SQL equivalent:
   *   SELECT status, COUNT(*) AS count
   *   FROM   ticket
   *   WHERE  "eventId" = :eventId
   *   GROUP  BY status
   */
  async getEventStats(eventId: string): Promise<{
    totalTickets: number;
    issued: number;
    scanned: number;
    refunded: number;
    cancelled: number;
    scanRate: number;
  }> {
    const rows: { status: TicketStatus; count: string }[] =
      await this.ticketRepository
        .createQueryBuilder('ticket')
        .select('ticket.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('ticket.eventId = :eventId', { eventId })
        .groupBy('ticket.status')
        .getRawMany();

    // Fold the aggregate rows into a plain lookup map.
    // COUNT() returns a string in most drivers, so we parse to number.
    const countByStatus = new Map<TicketStatus, number>(
      rows.map(({ status, count }) => [status, parseInt(count, 10)]),
    );

    const get = (s: TicketStatus) => countByStatus.get(s) ?? 0;

    const issued = get(TicketStatus.ISSUED);
    const scanned = get(TicketStatus.SCANNED);
    const refunded = get(TicketStatus.REFUNDED);
    const cancelled = get(TicketStatus.CANCELLED);
    const totalTickets = issued + scanned + refunded + cancelled;

    // scanRate: percentage of issued+scanned tickets that have been scanned.
    // Denominator excludes refunded/cancelled because those were never
    // available to scan.
    const scannable = issued + scanned;
    const scanRate = scannable > 0
      ? Math.round((scanned / scannable) * 100 * 100) / 100 // 2 d.p.
      : 0;

    return { totalTickets, issued, scanned, refunded, cancelled, scanRate };
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
      cancelledAt: ticket.cancelledAt ?? null,
      cancellationReason: ticket.cancellationReason ?? null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}
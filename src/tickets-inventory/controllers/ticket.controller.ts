import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TicketService } from '../services/ticket.service';
import { CreateTicketDto } from '../dto/create-ticket.dto';
import { TicketResponseDto } from '../dto/ticket.response.dto';

@Controller('events/:eventId/tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  /**
   * Create tickets for a ticket type
   * POST /events/:eventId/tickets
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() createTicketDto: CreateTicketDto,
  ): Promise<TicketResponseDto[]> {
    return this.ticketService.createTickets(eventId, createTicketDto);
  }

  /**
   * Get all tickets for an event
   * GET /events/:eventId/tickets
   */
  @Get()
  async findByEvent(
    @Param('eventId') eventId: string,
  ): Promise<TicketResponseDto[]> {
    return this.ticketService.findByEvent(eventId);
  }

  /**
   * Get a specific ticket
   * GET /events/:eventId/tickets/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<TicketResponseDto> {
    return this.ticketService.findById(id);
  }

  /**
   * Scan a ticket by ID
   * POST /events/:eventId/tickets/:id/scan
   */
  @Post(':id/scan')
  async scanTicket(@Param('id') id: string): Promise<TicketResponseDto> {
    return this.ticketService.scanTicket(id);
  }

  /**
   * Scan a ticket by QR code
   * POST /events/:eventId/tickets/scan-qr
   */
  @Post('scan-qr/:qrCode')
  async scanByQrCode(@Param('qrCode') qrCode: string): Promise<TicketResponseDto> {
    return this.ticketService.scanByQrCode(qrCode);
  }

  /**
   * Refund a ticket
   * POST /events/:eventId/tickets/:id/refund
   */
  @Post(':id/refund')
  async refundTicket(@Param('id') id: string): Promise<TicketResponseDto> {
    return this.ticketService.refundTicket(id);
  }

  /**
   * Get event statistics
   * GET /events/:eventId/tickets/stats
   */
  @Get('stats/event')
  async getEventStats(
    @Param('eventId') eventId: string,
  ): Promise<any> {
    return this.ticketService.getEventStats(eventId);
  }
}

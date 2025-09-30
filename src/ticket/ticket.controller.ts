import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Header,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TicketQrService } from './ticket-qr.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';
import { TicketCrudService } from './ticket-crud.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketController {
  constructor(
    private readonly ticketQrService: TicketQrService,
    private readonly ticketCrud: TicketCrudService,

  ) {}

  // Basic CRUD endpoints
  @Post()
  @ApiOperation({ summary: 'Create a ticket' })
  @ApiBody({ type: CreateTicketDto })
  @ApiResponse({ status: 201, description: 'Ticket created' })
  async createTicket(@Body() dto: CreateTicketDto) {
    return this.ticketCrud.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a ticket by ID' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicket(@Param('id') id: string) {
    return this.ticketCrud.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a ticket (e.g., status)' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiBody({ type: UpdateTicketDto })
  @ApiResponse({ status: 200, description: 'Ticket updated' })
  async updateTicket(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketCrud.update(id, dto);
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Generate time-sensitive QR code for a ticket' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiResponse({ status: 200, description: 'SVG QR code' })
  @Header('Content-Type', 'image/svg+xml')
  async getTicketQr(@Param('id') id: string): Promise<string> {
    return this.ticketQrService.generateQrSvg(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a time-sensitive ticket QR code' })
  @ApiBody({ type: ValidateQrDto })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateTicketQr(@Body() dto: ValidateQrDto) {
    const result = this.ticketQrService.validateCode(dto.code);
    if (!result.valid) {
      // Explicitly reject expired codes per acceptance criteria
      throw new BadRequestException(result.reason ?? 'Invalid code');
    }
    return {
      status: 'ok',
      ticketId: result.ticketId,
    };

  }
}

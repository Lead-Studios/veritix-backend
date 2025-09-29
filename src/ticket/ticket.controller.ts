import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Header,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TicketQrService } from './ticket-qr.service';
import { TicketService } from './ticket.service';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { TransferTicketDto } from './dto/transfer-ticket.dto';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketController {
  constructor(
    private readonly ticketQrService: TicketQrService,
    private readonly ticketService: TicketService,
  ) {}

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
  validateTicketQr(@Body() dto: ValidateQrDto) {
    const result = this.ticketQrService.validateCode(dto.code);
    if (!result.valid) {
      // Explicitly reject expired codes per acceptance criteria
      throw new BadRequestException(result.reason ?? 'Invalid code');
    }
    return { status: 'ok', ticketId: result.ticketId };
  }

  @Post(':id/transfer')
  @ApiOperation({ summary: 'Transfer ticket ownership to another user' })
  @ApiParam({ name: 'id', description: 'Ticket ID' })
  @ApiBody({ type: TransferTicketDto })
  @ApiResponse({ status: 200, description: 'Ticket transferred successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - non-transferable or max transfers exceeded',
  })
  @ApiResponse({ status: 404, description: 'Ticket or user not found' })
  async transferTicket(
    @Param('id') id: string,
    @Body() dto: TransferTicketDto,
  ) {
    const updatedTicket = await this.ticketService.transferTicket(id, dto);
    return {
      message: 'Ticket transferred successfully',
      ticket: updatedTicket,
    };
  }
}

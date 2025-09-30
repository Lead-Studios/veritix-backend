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
import { ValidateQrDto } from './dto/validate-qr.dto';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketController {
  constructor(
    private readonly ticketQrService: TicketQrService,
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
  async validateTicketQr(@Body() dto: ValidateQrDto) {
    const result = await this.ticketQrService.validateCode(dto.code);
    if (result.valid) {
      return { valid: true };
    } else {
      return { valid: false, reason: result.reason };
    }
  }
}

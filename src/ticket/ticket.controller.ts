import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  Res,
  Post,
} from '@nestjs/common';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('Ticket')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user/ticket')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get all user ticket history' })
  async getHistory(@Req() req) {
    return this.ticketService.getUserTicketHistory(req.user.userId);
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'Get a single ticket history' })
  async getSingleHistory(@Req() req, @Param('id') id: string) {
    return this.ticketService.getSingleTicketHistory(req.user.userId, id);
  }

  @Get('details/:id')
  @ApiOperation({ summary: 'Get ticket details' })
  async getDetails(@Param('id') id: string) {
    return this.ticketService.getTicketDetails(id);
  }

  @Get('receipt/:id')
  @ApiOperation({ summary: 'Get ticket receipt' })
  async getReceipt(@Param('id') id: string) {
    return this.ticketService.getTicketReceipt(id);
  }

  @Post('receipt/download/:id')
  @ApiOperation({ summary: 'Download ticket receipt as PDF' })
  async downloadReceipt(@Param('id') id: string, @Res() res: Response) {
    const pdfBuffer = await this.ticketService.downloadTicketReceiptPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-receipt-${id}.pdf"`,
    });
    res.send(pdfBuffer);
  }
}

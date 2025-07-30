import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TicketStatsService } from './ticket-stats.service';
import { TicketPurchaseDto } from './dto/ticket-stats.dto';

@Controller('tickets')
@UseGuards(AuthGuard('jwt'))
export class TicketController {
  constructor(private ticketStatsService: TicketStatsService) {}

  @Post('purchase')
  async purchaseTicket(@Body() purchaseData: TicketPurchaseDto) {
    const updatedStats =
      await this.ticketStatsService.onTicketSold(purchaseData);

    return {
      success: true,
      message: 'Ticket purchased successfully',
      stats: updatedStats,
    };
  }

  @Get('stats/:eventId')
  async getEventStats(@Param('eventId') eventId: string) {
    const stats = await this.ticketStatsService.getEventStats(eventId);

    if (!stats) {
      return { success: false, message: 'Event not found' };
    }

    return { success: true, stats };
  }
}

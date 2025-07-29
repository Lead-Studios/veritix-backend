import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { TicketTierResponseDto } from './dto/ticket-tier-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketTierService } from './ticket-tier.service';

@Controller('ticket-tiers')
@UseGuards(JwtAuthGuard)
export class TicketTierController {
  constructor(private readonly ticketTierService: TicketTierService) {}

  @Post(':eventId')
  create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateTicketTierDto,
    @Request() req,
  ) {
    return this.ticketTierService.create(eventId, dto, req.user.id);
  }

  @Get(':eventId')
  findByEvent(@Param('eventId') eventId: string): Promise<TicketTierResponseDto[]> {
    return this.ticketTierService.findByEvent(eventId);
  }

  @Get('tier/:id')
  findOne(@Param('id') id: string): Promise<TicketTierResponseDto> {
    return this.ticketTierService.findOne(id);
  }

  @Get('tier/:id/price')
  getCurrentPrice(@Param('id') id: string): Promise<{ currentPrice: number }> {
    return this.ticketTierService.getCurrentPrice(id).then(price => ({ currentPrice: price }));
  }
}
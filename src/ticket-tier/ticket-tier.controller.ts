import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CreateTicketTierDto } from './dto/create-ticket-tier.dto';
import { JwtAuthGuard } from 'security/guards/jwt-auth.guard';
import { TicketTierService } from './ticket-tier.module';

@Controller('events/:eventId/ticket-tiers')
@UseGuards(JwtAuthGuard)
export class TicketTierController {
  constructor(private readonly ticketTierService: TicketTierService) {}

  @Post()
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateTicketTierDto,
    @Req() req,
  ) {
    return this.ticketTierService.create(eventId, dto, req.user.id);
  }

  @Get()
  async findAll(@Param('eventId') eventId: string) {
    return this.ticketTierService.findByEvent(eventId);
  }
}
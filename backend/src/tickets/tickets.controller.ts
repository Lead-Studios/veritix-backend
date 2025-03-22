import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TicketService } from '../tickets/tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { RolesGuard } from '../../security/guards/rolesGuard/roles.guard';
//import { Roles } from '../../security/decorators/roles.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  //@Roles('admin') // Only admin can create tickets
  async createTicket(@Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(dto);
  }

  @Get()
  async getAllTickets() {
    return this.ticketService.getAllTickets();
  }

  @Get(':id')
  async getTicketById(@Param('id') id: string) {
    return this.ticketService.getTicketById(id);
  }

  @Get('/event/:eventId')
  async getTicketsByEvent(@Param('eventId') eventId: string) {
    return this.ticketService.getTicketsByEvent(eventId);
  }

  @Put(':id')
  //@Roles('admin') // Only admin can update tickets
  async updateTicket(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTicketDto>,
  ) {
    return this.ticketService.updateTicket(id, dto);
  }

  @Delete(':id')
  //@Roles('admin') // Only admin can delete tickets
  async deleteTicket(@Param('id') id: string) {
    return this.ticketService.deleteTicket(id);
  }
}

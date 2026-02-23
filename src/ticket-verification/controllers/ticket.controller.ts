import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TicketService } from '../services/ticket.service';
import { CreateTicketDto, UpdateTicketDto, TicketResponseDto } from '../dto/ticket.dto';
import { TicketEntity, TicketStatus } from '../entities/ticket.entity';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({
    status: 201,
    description: 'Ticket created successfully',
    type: TicketResponseDto,
  })
  async createTicket(createTicketDto: CreateTicketDto): Promise<TicketEntity> {
    return this.ticketService.createTicket(createTicketDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tickets with pagination' })
  @ApiResponse({ status: 200, description: 'Tickets retrieved successfully' })
  async getAllTickets(page: number = 1, limit: number = 50, status?: TicketStatus) {
    return this.ticketService.getAllTickets(page, limit, status);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get ticket statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return this.ticketService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({
    status: 200,
    description: 'Ticket retrieved successfully',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicket(id: string): Promise<TicketEntity> {
    return this.ticketService.getTicket(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get ticket by code' })
  @ApiResponse({
    status: 200,
    description: 'Ticket retrieved successfully',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getTicketByCode(code: string): Promise<TicketEntity> {
    return this.ticketService.getTicketByCode(code);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ticket' })
  @ApiResponse({
    status: 200,
    description: 'Ticket updated successfully',
    type: TicketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async updateTicket(id: string, updateTicketDto: UpdateTicketDto): Promise<TicketEntity> {
    return this.ticketService.updateTicket(id, updateTicketDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete ticket' })
  @ApiResponse({ status: 204, description: 'Ticket deleted successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async deleteTicket(id: string): Promise<void> {
    return this.ticketService.deleteTicket(id);
  }
}

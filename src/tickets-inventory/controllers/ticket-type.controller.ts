import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { TicketTypeService } from '../services/ticket-type.service';
import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from '../dto/update-ticket-type.dto';
import { TicketTypeResponseDto } from '../dto/ticket-type.response.dto';
import { JwtAuthGuard } from '../../auth/guard/jwt.auth.guard';

@Controller('events/:eventId/ticket-types')
export class TicketTypeController {
  constructor(private readonly ticketTypeService: TicketTypeService) {}

  /**
   * Create a new ticket type for an event
   * POST /events/:eventId/ticket-types
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('eventId') eventId: string,
    @Body() createTicketTypeDto: CreateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypeService.create(eventId, createTicketTypeDto);
  }

  /**
   * Get all ticket types for an event
   * GET /events/:eventId/ticket-types
   */
  @Get()
  async findByEvent(
    @Param('eventId') eventId: string,
  ): Promise<TicketTypeResponseDto[]> {
    return this.ticketTypeService.findByEvent(eventId);
  }

  /**
   * Get inventory summary for an event
   * GET /events/:eventId/ticket-types/summary/inventory
   */
  @Get('summary/inventory')
  async getInventorySummary(@Param('eventId') eventId: string): Promise<any> {
    return this.ticketTypeService.getInventorySummary(eventId);
  }

  /**
   * Get a specific ticket type
   * GET /events/:eventId/ticket-types/:id
   */
  @Get(':id')
  async findById(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypeService.findById(id);
  }

  /**
   * Update a ticket type
   * PUT /events/:eventId/ticket-types/:id
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
    @Body() updateTicketTypeDto: UpdateTicketTypeDto,
  ): Promise<TicketTypeResponseDto> {
    return this.ticketTypeService.update(id, updateTicketTypeDto);
  }

  /**
   * Delete a ticket type
   * DELETE /events/:eventId/ticket-types/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async delete(
    @Param('eventId') eventId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.ticketTypeService.delete(id);
  }
}

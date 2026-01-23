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
} from '@nestjs/common';
import { TicketTypeService } from '../services/ticket-type.service';
import { CreateTicketTypeDto } from '../dto/create-ticket-type.dto';
import { UpdateTicketTypeDto } from '../dto/update-ticket-type.dto';
import { TicketTypeResponseDto } from '../dto/ticket-type.response.dto';

@Controller('events/:eventId/ticket-types')
export class TicketTypeController {
  constructor(private readonly ticketTypeService: TicketTypeService) {}

  /**
   * Create a new ticket type for an event
   * POST /events/:eventId/ticket-types
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async findByEvent(eventId: string): Promise<TicketTypeResponseDto[]> {
    return this.ticketTypeService.findByEvent(eventId);
  }

  /**
   * Get a specific ticket type
   * GET /events/:eventId/ticket-types/:id
   */
  @Get(':id')
  async findById(id: string): Promise<TicketTypeResponseDto> {
    return this.ticketTypeService.findById(id);
  }

  /**
   * Update a ticket type
   * PUT /events/:eventId/ticket-types/:id
   */
  @Put(':id')
  async update(
    id: string,
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
  async delete(id: string): Promise<void> {
    return this.ticketTypeService.delete(id);
  }

  /**
   * Get inventory summary for an event
   * GET /events/:eventId/ticket-types/summary
   */
  @Get('summary/inventory')
  async getInventorySummary(eventId: string): Promise<any> {
    return this.ticketTypeService.getInventorySummary(eventId);
  }
}

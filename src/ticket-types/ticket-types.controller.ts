import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TicketTypesService } from './ticket-types.service';
import { TicketType } from './entities/ticket-type.entity';

@Controller()
export class TicketTypesController {
  constructor(private readonly ticketTypesService: TicketTypesService) {}

  @Get('events/:eventId/ticket-types/availability')
  async getTicketTypesAvailability(@Param('eventId') eventId: string) {
    try {
      const ticketTypes =
        await this.ticketTypesService.getTicketTypesWithAvailability(eventId);

      if (ticketTypes.length === 0) {
        throw new NotFoundException(
          `No ticket types found for event with ID ${eventId}`,
        );
      }

      return {
        eventId,
        ticketTypes: ticketTypes.map((ticketType) => ({
          id: ticketType.id,
          name: ticketType.name,
          description: ticketType.description,
          price: ticketType.price,
          totalQuantity: ticketType.totalQuantity,
          soldQuantity: ticketType.soldQuantity,
          remainingQuantity: ticketType.remainingQuantity,
          isActive: ticketType.isActive,
          saleStartsAt: ticketType.saleStartsAt,
          saleEndsAt: ticketType.saleEndsAt,
          isAvailableNow: ticketType.isAvailableNow,
          createdAt: ticketType.createdAt,
          updatedAt: ticketType.updatedAt,
        })),
      };
    } catch (error) {
      throw new NotFoundException(
        `Event with ID ${eventId} not found or has no ticket types`,
      );
    }
  }

  @Get('events/:eventId/ticket-types')
  async getTicketTypesByEvent(@Param('eventId') eventId: string) {
    const ticketTypes = await this.ticketTypesService.findByEventId(eventId);

    if (ticketTypes.length === 0) {
      throw new NotFoundException(
        `No ticket types found for event with ID ${eventId}`,
      );
    }

    return {
      eventId,
      ticketTypes,
    };
  }

  @Get(':id')
  async getTicketType(@Param('id') id: string) {
    const ticketType = await this.ticketTypesService.findOne(id);

    if (!ticketType) {
      throw new NotFoundException(`Ticket type with ID ${id} not found`);
    }

    return ticketType;
  }
}

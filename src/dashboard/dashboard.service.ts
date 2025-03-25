import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Event } from "src/events/entities/event.entity";
import { Ticket } from "src/tickets/entities/ticket.entity";
import { Repository } from "typeorm";

@Injectable()
export class EventDashboardService {
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
    @InjectRepository(Ticket) private ticketRepository: Repository<Ticket>,
  ) {}

  async getDashboardMetrics(eventId: string) {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new Error('Event not found');
    }

    const ticketsSold = await this.ticketRepository.count({ where: { eventId: event.id } });
    const totalRevenue = await this.ticketRepository
      .createQueryBuilder('ticket')
      .select('SUM(ticket.price)', 'total')
      .where('ticket.eventId = :eventId', { eventId })
      .getRawOne();

    const totalRevenueValue = totalRevenue.total || 0;
    const totalProfit = totalRevenueValue - totalRevenueValue * 0.1;
    const totalTicketQuantity = await this.ticketRepository
    .createQueryBuilder('ticket')
    .select('SUM(ticket.quantity)', 'totalQuantity')
    .where('ticket.eventId = :eventId', { eventId })
    .getRawOne();

  const availableTickets = (totalTicketQuantity.totalQuantity || 0) - ticketsSold;

    return {
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventLocation: {
        country: event.country,
        localGovernment: event.localGovernment,
        state: event.state,
        street: event.street,
      },
      eventImage: event.eventImage,
      totalTicketsSold: ticketsSold,
      totalRevenue: totalRevenueValue,
      totalProfit,
      availableTickets,
    };
  }
}

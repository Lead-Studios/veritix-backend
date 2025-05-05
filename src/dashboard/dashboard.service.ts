import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Event } from "src/events/entities/event.entity";
import { Ticket } from "src/tickets/entities/ticket.entity";
import { Repository } from "typeorm";
import { ReportPeriodEnum } from "../common/enums/report-period.enum";
import { TimeFilter } from "../common/enums/time-filter.enum";

@Injectable()
export class EventDashboardService {
  constructor(
    @InjectRepository(Event) private eventRepository: Repository<Event>,
    @InjectRepository(Ticket) private ticketRepository: Repository<Ticket>,
  ) {}

  async getDashboardMetrics(eventId: string) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ["posters", "galleryItems"],
    });
    if (!event) {
      throw new Error("Event not found");
    }

    const ticketsSold = await this.ticketRepository.count({
      where: { eventId: event.id },
    });
    const totalRevenue = await this.ticketRepository
      .createQueryBuilder("ticket")
      .select("SUM(ticket.price)", "total")
      .where("ticket.eventId = :eventId", { eventId })
      .getRawOne();

    const totalRevenueValue = totalRevenue.total || 0;
    const totalProfit = totalRevenueValue - totalRevenueValue * 0.1;
    const totalTicketQuantity = await this.ticketRepository
      .createQueryBuilder("ticket")
      .select("SUM(ticket.quantity)", "totalQuantity")
      .where("ticket.eventId = :eventId", { eventId })
      .getRawOne();

    const availableTickets =
      (totalTicketQuantity.totalQuantity || 0) - ticketsSold;

    // Get the first poster or gallery item image if available
    const eventImage = event.posters?.[0]?.imageUrl || null;

    return {
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventLocation: {
        address: event.address,
        venue: event.venue,
      },
      eventImage,
      totalTicketsSold: ticketsSold,
      totalRevenue: totalRevenueValue,
      totalProfit,
      availableTickets,
    };
  }

  async getStats(period?: ReportPeriodEnum, startDate?: Date, endDate?: Date) {
    // Implementation for getting dashboard statistics
    return {
      totalEvents: 0,
      totalTickets: 0,
      totalRevenue: 0,
    };
  }

  async getRevenueAnalytics(period?: ReportPeriodEnum) {
    // Implementation for revenue analytics
    return {
      revenue: 0,
      growth: 0,
      period,
    };
  }

  async getEventPerformance(top?: number) {
    // Implementation for event performance
    return {
      events: [],
      top,
    };
  }

  async getTicketSalesAnalytics(eventId?: string) {
    // Implementation for ticket sales analytics
    return {
      sales: 0,
      eventId,
    };
  }
}

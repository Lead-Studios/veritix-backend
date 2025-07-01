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
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
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

  async getEventPerformance(top: number = 5) {
    return this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.tickets", "ticket")
      .select("event.id", "id")
      .addSelect("event.eventName", "eventName")
      .addSelect("COUNT(ticket.id)", "ticketsSold")
      .addSelect("SUM(ticket.price)", "totalRevenue")
      .groupBy("event.id")
      .orderBy("totalRevenue", "DESC")
      .limit(top)
      .getRawMany();
  }

  async getTicketSalesAnalytics(eventId?: string) {
    const query = this.ticketRepository
      .createQueryBuilder("ticket")
      .select("ticket.eventId", "eventId")
      .addSelect("SUM(ticket.price)", "totalRevenue")
      .addSelect("COUNT(ticket.id)", "ticketsSold")
      .groupBy("ticket.eventId");

    if (eventId) {
      query.where("ticket.eventId = :eventId", { eventId });
    }

    return query.getRawMany();
  }

  async getRevenueAnalytics(period?: string) {
    const query = this.ticketRepository
      .createQueryBuilder("ticket")
      .select("SUM(ticket.price)", "totalRevenue")
      .addSelect("DATE_TRUNC(:period, ticket.createdAt)", "period")
      .setParameter("period", period || "month")
      .groupBy("period");

    return query.getRawMany();
  }

  async getTopPerformingEvents(top: number = 5) {
    return this.eventRepository
      .createQueryBuilder("event")
      .leftJoinAndSelect("event.tickets", "ticket")
      .select("event.id", "id")
      .addSelect("event.eventName", "eventName")
      .addSelect("COUNT(ticket.id)", "ticketsSold")
      .addSelect("SUM(ticket.price)", "totalRevenue")
      .groupBy("event.id")
      .orderBy("totalRevenue", "DESC")
      .limit(top)
      .getRawMany();
  }

  async getStats(period: string, startDate?: Date, endDate?: Date) {
    const query = this.ticketRepository
      .createQueryBuilder("ticket")
      .select("SUM(ticket.price)", "totalRevenue")
      .addSelect("COUNT(ticket.id)", "ticketsSold")
      .addSelect("DATE_TRUNC(:period, ticket.createdAt)", "period")
      .setParameter("period", period || "month");

    if (startDate) {
      query.andWhere("ticket.createdAt >= :startDate", { startDate });
    }
    if (endDate) {
      query.andWhere("ticket.createdAt <= :endDate", { endDate });
    }

    return query.groupBy("period").getRawMany();
  }
}

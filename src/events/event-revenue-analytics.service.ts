import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThanOrEqual } from "typeorm";
import { Event } from "./entities/event.entity";
import { TimeFilter } from "../common/enums/time-filter.enum";
import { Ticket } from "../tickets/entities/ticket.entity";

@Injectable()
export class EventRevenueAnalyticsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  // Calculate total revenue for an event
  async calculateTotalRevenue(eventId: string): Promise<number> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ["tickets"],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Sum of all ticket prices
    return event.tickets.reduce((total, ticket) => total + ticket.price, 0);
  }

  // Calculate total profit (10% transaction fee deduction)
  async calculateTotalProfit(eventId: string): Promise<number> {
    const totalRevenue = await this.calculateTotalRevenue(eventId);
    const transactionFee = totalRevenue * 0.1; // 10% transaction fee
    return totalRevenue - transactionFee;
  }

  // Filter revenue based on time period
  async calculateFilteredRevenue(
    eventId: string,
    filter: TimeFilter,
  ): Promise<number> {
    const queryBuilder = this.ticketRepository
      .createQueryBuilder("ticket")
      .where("ticket.eventId = :eventId", { eventId });

    // Apply time-based filtering
    switch (filter) {
      case TimeFilter.DAILY:
        queryBuilder.andWhere(
          "ticket.createdAt >= CURRENT_DATE AND ticket.createdAt < CURRENT_DATE + INTERVAL '1 day'",
        );
        break;
      case TimeFilter.WEEKLY:
        queryBuilder.andWhere(
          "ticket.createdAt >= date_trunc('week', CURRENT_DATE) AND ticket.createdAt < date_trunc('week', CURRENT_DATE) + INTERVAL '1 week'",
        );
        break;
      case TimeFilter.MONTHLY:
        queryBuilder.andWhere(
          "ticket.createdAt >= date_trunc('month', CURRENT_DATE) AND ticket.createdAt < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'",
        );
        break;
      case TimeFilter.YEARLY:
        queryBuilder.andWhere(
          "ticket.createdAt >= date_trunc('year', CURRENT_DATE) AND ticket.createdAt < date_trunc('year', CURRENT_DATE) + INTERVAL '1 year'",
        );
        break;
      default:
        throw new Error("Invalid time filter");
    }

    // Sum ticket prices for the filtered period
    const result = await queryBuilder
      .select("SUM(ticket.price)", "totalRevenue")
      .getRawOne();

    return parseFloat(result.totalRevenue) || 0;
  }

  // Filter profit based on time period
  async calculateFilteredProfit(
    eventId: string,
    filter: TimeFilter,
  ): Promise<number> {
    const filteredRevenue = await this.calculateFilteredRevenue(
      eventId,
      filter,
    );
    const transactionFee = filteredRevenue * 0.1; // 10% transaction fee
    return filteredRevenue - transactionFee;
  }

  async getRevenue(eventId: string, filter: TimeFilter): Promise<number> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ["tickets"],
    });

    if (!event) {
      throw new Error("Event not found");
    }

    const tickets = await this.getTicketsByTimeFilter(eventId, filter);
    return tickets.reduce((total, ticket) => total + ticket.price, 0);
  }

  async getProfit(eventId: string, filter: TimeFilter): Promise<number> {
    const revenue = await this.getRevenue(eventId, filter);
    const expenses = await this.calculateExpenses(eventId, filter);
    return revenue - expenses;
  }

  private async getTicketsByTimeFilter(
    eventId: string,
    filter: TimeFilter,
  ): Promise<Ticket[]> {
    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case TimeFilter.DAILY:
        startDate = new Date(now.setDate(now.getDate() - 1));
        break;
      case TimeFilter.WEEKLY:
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case TimeFilter.MONTHLY:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case TimeFilter.YEARLY:
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case TimeFilter.ALL_TIME:
        return this.ticketRepository.find({
          where: { event: { id: eventId } },
        });
      default:
        throw new Error("Invalid time filter");
    }

    return this.ticketRepository.find({
      where: {
        event: { id: eventId },
        createdAt: MoreThanOrEqual(startDate),
      },
    });
  }

  private async calculateExpenses(
    eventId: string,
    filter: TimeFilter,
  ): Promise<number> {
    // Implement your expense calculation logic here
    // This is a placeholder - you'll need to implement the actual expense calculation
    return 0;
  }
}

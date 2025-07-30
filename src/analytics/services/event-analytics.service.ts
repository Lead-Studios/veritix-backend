import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { EventAnalyticsFilterDto } from '../dtos/event-analytics-filter.dto';
import { TicketHistory } from '../../ticket/entities/ticket-history.entity';

function getPeriodRange(filter?: string): [Date, Date] {
  const now = new Date();
  let start: Date;
  if (filter === 'daily') {
    start = new Date(now);
    start.setHours(0, 0, 0, 0);
  } else if (filter === 'weekly') {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else if (filter === 'monthly') {
    start = new Date(now);
    start.setMonth(now.getMonth() - 1);
  } else if (filter === 'yearly') {
    start = new Date(now);
    start.setFullYear(now.getFullYear() - 1);
  } else {
    start = new Date(0);
  }
  return [start, now];
}

@Injectable()
export class EventAnalyticsService {
  constructor(
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepo: Repository<TicketHistory>,
  ) {}

  async getRevenue(eventId: string, filter?: string): Promise<number> {
    const [start, end] = getPeriodRange(filter);
    const { sum } = await this.ticketHistoryRepo
      .createQueryBuilder('th')
      .select('SUM(th.amount)', 'sum')
      .where('th.ticketId = :eventId', { eventId })
      .andWhere('th.purchaseDate BETWEEN :start AND :end', { start, end })
      .getRawOne();
    return Number(sum) || 0;
  }

  async getProfit(eventId: string, filter?: string): Promise<number> {
    const revenue = await this.getRevenue(eventId, filter);
    return revenue - revenue * 0.1;
  }
}

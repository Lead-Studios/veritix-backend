import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Conference } from '../entities/conference.entity';
import * as dayjs from 'dayjs';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  private getDateRange(filter?: string): [Date, Date] | null {
    const now = dayjs();
    switch (filter) {
      case 'daily':
        return [now.startOf('day').toDate(), now.endOf('day').toDate()];
      case 'weekly':
        return [now.startOf('week').toDate(), now.endOf('week').toDate()];
      case 'monthly':
        return [now.startOf('month').toDate(), now.endOf('month').toDate()];
      case 'yearly':
        return [now.startOf('year').toDate(), now.endOf('year').toDate()];
      default:
        return null;
    }
  }

  async getRevenue(conferenceId: number, filter?: string) {
    const range = this.getDateRange(filter);
    const where: any = { conferenceId };

    if (range) {
      where.purchaseDate = Between(range[0], range[1]);
    }

    const result = await this.ticketRepo
      .createQueryBuilder('ticket')
      .select('SUM(ticket.price * ticket.quantity)', 'total')
      .where(where)
      .getRawOne();

    const revenue = Number(result.total) || 0;
    return { revenue };
  }

  async getProfit(conferenceId: number, filter?: string) {
    const { revenue } = await this.getRevenue(conferenceId, filter);
    const profit = revenue - revenue * 0.1;
    return { profit: Number(profit.toFixed(2)) };
  }
}
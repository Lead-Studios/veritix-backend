import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserReportFilterDto } from '../dtos/user-report-filter.dto';
import { UserReportResource } from '../resources/user-report.resource';
import { User } from '../../user/entities/user.entity';
import { TicketHistory } from '../../ticket/entities/ticket-history.entity';

function getPeriodRange(period: string): [Date, Date] {
  const now = new Date();
  let start: Date;
  if (period === 'week') {
    start = new Date(now);
    start.setDate(now.getDate() - 7);
  } else if (period === 'month') {
    start = new Date(now);
    start.setMonth(now.getMonth() - 1);
  } else if (period === 'year') {
    start = new Date(now);
    start.setFullYear(now.getFullYear() - 1);
  } else {
    start = new Date(0);
  }
  return [start, now];
}

@Injectable()
export class UserReportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TicketHistory)
    private readonly ticketHistoryRepo: Repository<TicketHistory>,
  ) {}

  async generateReport(filter: UserReportFilterDto) {
    const period = filter.period || 'all';
    const [start, end] = getPeriodRange(period);

    // Total users
    const users = await this.userRepo.count();

    // New users in period
    const newUsers = await this.userRepo.count({
      where: { createdAt: Between(start, end) },
    });

    // Active users: users with ticket purchases in period
    const activeUserIds = await this.ticketHistoryRepo
      .createQueryBuilder('th')
      .select('th.userId')
      .where('th.purchaseDate BETWEEN :start AND :end', { start, end })
      .groupBy('th.userId')
      .getRawMany();
    const active = activeUserIds.length;

    const report = {
      period,
      stats: {
        users,
        active,
        new: newUsers,
      },
    };
    return UserReportResource.toResponse(report);
  }
}

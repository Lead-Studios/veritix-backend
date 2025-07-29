import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { TicketingTicket } from '../../ticketing/entities/ticket.entity';
import { Conference } from '../../conference/entities/conference.entity';
import {
  TimeFilter,
  ExportFormat,
  ConferenceTicketAnalyticsResponseDto,
  ConferenceTicketTotalResponseDto,
  TicketAnalyticsDataDto,
} from '../dto/conference-ticket-analytics.dto';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class ConferenceTicketAnalyticsService {
  constructor(
    @InjectRepository(TicketingTicket)
    private readonly ticketRepo: Repository<TicketingTicket>,
    @InjectRepository(Conference)
    private readonly conferenceRepo: Repository<Conference>,
  ) {}

  /**
   * Get total tickets for a conference
   */
  async getTotalTickets(
    conferenceId: string,
  ): Promise<ConferenceTicketTotalResponseDto> {
    // Verify conference exists
    const conference = await this.conferenceRepo.findOne({
      where: { id: parseInt(conferenceId) },
    });
    if (!conference) {
      throw new NotFoundException(
        `Conference with ID ${conferenceId} not found`,
      );
    }

    // Get tickets for this conference (assuming tickets have conferenceId field)
    const tickets = await this.ticketRepo.find({
      where: { conferenceId },
      select: ['pricePaid'],
    });

    const totalTickets = tickets.length;
    const totalRevenue = tickets.reduce(
      (sum, ticket) => sum + Number(ticket.pricePaid),
      0,
    );
    const averageTicketPrice =
      totalTickets > 0 ? totalRevenue / totalTickets : 0;

    return {
      conferenceId,
      totalTickets,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageTicketPrice: Math.round(averageTicketPrice * 100) / 100,
    };
  }

  /**
   * Get filtered ticket analytics for a conference
   */
  async getTicketAnalytics(
    conferenceId: string,
    filter?: TimeFilter,
  ): Promise<ConferenceTicketAnalyticsResponseDto> {
    // Verify conference exists
    const conference = await this.conferenceRepo.findOne({
      where: { id: parseInt(conferenceId) },
    });
    if (!conference) {
      throw new NotFoundException(
        `Conference with ID ${conferenceId} not found`,
      );
    }

    const { startDate, endDate } = this.getDateRange(filter);
    const data = await this.getFilteredTicketData(
      conferenceId,
      filter,
      startDate,
      endDate,
    );
    const totalTickets = data.reduce((sum, item) => sum + item.ticketCount, 0);

    return {
      conferenceId,
      totalTickets,
      filter,
      data,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  /**
   * Export ticket analytics data
   */
  async exportTicketAnalytics(
    conferenceId: string,
    format: ExportFormat,
    res: Response,
    filter?: TimeFilter,
  ): Promise<void> {
    // Verify conference exists
    const conference = await this.conferenceRepo.findOne({
      where: { id: parseInt(conferenceId) },
    });
    if (!conference) {
      throw new NotFoundException(
        `Conference with ID ${conferenceId} not found`,
      );
    }

    const { startDate, endDate } = this.getDateRange(filter);
    const data = await this.getFilteredTicketData(
      conferenceId,
      filter,
      startDate,
      endDate,
    );

    if (format === ExportFormat.CSV) {
      await this.exportToCSV(data, conferenceId, res);
    } else if (format === ExportFormat.XLS) {
      await this.exportToXLS(data, conferenceId, res);
    } else {
      throw new BadRequestException(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get date range based on filter
   */
  private getDateRange(filter?: TimeFilter): {
    startDate: Date;
    endDate: Date;
  } {
    const now = new Date();
    let startDate: Date;

    switch (filter) {
      case TimeFilter.HOURLY:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
        break;
      case TimeFilter.DAILY:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
        break;
      case TimeFilter.WEEKLY:
        startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000); // Last 4 weeks
        break;
      case TimeFilter.MONTHLY:
        startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // Last 12 months
        break;
      case TimeFilter.YEARLY:
        startDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years
        break;
      default:
        // No filter - get all time data
        startDate = new Date(0);
        break;
    }

    return { startDate, endDate: now };
  }

  /**
   * Get filtered ticket data based on time filter
   */
  private async getFilteredTicketData(
    conferenceId: string,
    filter?: TimeFilter,
    startDate?: Date,
    endDate?: Date,
  ): Promise<TicketAnalyticsDataDto[]> {
    const queryBuilder = this.ticketRepo
      .createQueryBuilder('ticket')
      .where('ticket.conferenceId = :conferenceId', { conferenceId });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'ticket.purchaseDate BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    switch (filter) {
      case TimeFilter.HOURLY:
        return this.getHourlyData(queryBuilder);
      case TimeFilter.DAILY:
        return this.getDailyData(queryBuilder);
      case TimeFilter.WEEKLY:
        return this.getWeeklyData(queryBuilder);
      case TimeFilter.MONTHLY:
        return this.getMonthlyData(queryBuilder);
      case TimeFilter.YEARLY:
        return this.getYearlyData(queryBuilder);
      default:
        return this.getAllTimeData(queryBuilder);
    }
  }

  /**
   * Get hourly aggregated data
   */
  private async getHourlyData(
    queryBuilder: any,
  ): Promise<TicketAnalyticsDataDto[]> {
    const results = await queryBuilder
      .select([
        "DATE_TRUNC('hour', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ])
      .groupBy("DATE_TRUNC('hour', ticket.purchaseDate)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results.map((result) => ({
      timestamp: result.timestamp,
      ticketCount: parseInt(result.ticketCount),
      conferenceId: result.conferenceId,
    }));
  }

  /**
   * Get daily aggregated data
   */
  private async getDailyData(
    queryBuilder: any,
  ): Promise<TicketAnalyticsDataDto[]> {
    const results = await queryBuilder
      .select([
        "DATE_TRUNC('day', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ])
      .groupBy("DATE_TRUNC('day', ticket.purchaseDate)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results.map((result) => ({
      timestamp: result.timestamp,
      ticketCount: parseInt(result.ticketCount),
      conferenceId: result.conferenceId,
    }));
  }

  /**
   * Get weekly aggregated data
   */
  private async getWeeklyData(
    queryBuilder: any,
  ): Promise<TicketAnalyticsDataDto[]> {
    const results = await queryBuilder
      .select([
        "DATE_TRUNC('week', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ])
      .groupBy("DATE_TRUNC('week', ticket.purchaseDate)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results.map((result) => ({
      timestamp: result.timestamp,
      ticketCount: parseInt(result.ticketCount),
      conferenceId: result.conferenceId,
    }));
  }

  /**
   * Get monthly aggregated data
   */
  private async getMonthlyData(
    queryBuilder: any,
  ): Promise<TicketAnalyticsDataDto[]> {
    const results = await queryBuilder
      .select([
        "DATE_TRUNC('month', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ])
      .groupBy("DATE_TRUNC('month', ticket.purchaseDate)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results.map((result) => ({
      timestamp: result.timestamp,
      ticketCount: parseInt(result.ticketCount),
      conferenceId: result.conferenceId,
    }));
  }

  /**
   * Get yearly aggregated data
   */
  private async getYearlyData(
    queryBuilder: any,
  ): Promise<TicketAnalyticsDataDto[]> {
    const results = await queryBuilder
      .select([
        "DATE_TRUNC('year', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ])
      .groupBy("DATE_TRUNC('year', ticket.purchaseDate)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results.map((result) => ({
      timestamp: result.timestamp,
      ticketCount: parseInt(result.ticketCount),
      conferenceId: result.conferenceId,
    }));
  }

  /**
   * Get all-time aggregated data
   */
  private async getAllTimeData(
    queryBuilder: any,
  ): Promise<TicketAnalyticsDataDto[]> {
    const results = await queryBuilder
      .select([
        "DATE_TRUNC('day', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ])
      .groupBy("DATE_TRUNC('day', ticket.purchaseDate)")
      .orderBy('timestamp', 'ASC')
      .getRawMany();

    return results.map((result) => ({
      timestamp: result.timestamp,
      ticketCount: parseInt(result.ticketCount),
      conferenceId: result.conferenceId,
    }));
  }

  /**
   * Export data to CSV format
   */
  private async exportToCSV(
    data: TicketAnalyticsDataDto[],
    conferenceId: string,
    res: Response,
  ): Promise<void> {
    const csvHeader = 'timestamp,ticketCount,conferenceId\n';
    const csvRows = data
      .map(
        (item) => `${item.timestamp},${item.ticketCount},${item.conferenceId}`,
      )
      .join('\n');
    const csvContent = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=conference-${conferenceId}-tickets.csv`,
    );
    res.send(csvContent);
  }

  /**
   * Export data to XLS format
   */
  private async exportToXLS(
    data: TicketAnalyticsDataDto[],
    conferenceId: string,
    res: Response,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ticket Analytics');

    // Add headers
    worksheet.columns = [
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Ticket Count', key: 'ticketCount', width: 15 },
      { header: 'Conference ID', key: 'conferenceId', width: 20 },
    ];

    // Add data
    data.forEach((item) => {
      worksheet.addRow({
        timestamp: item.timestamp,
        ticketCount: item.ticketCount,
        conferenceId: item.conferenceId,
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=conference-${conferenceId}-tickets.xlsx`,
    );

    await workbook.xlsx.write(res);
  }
}

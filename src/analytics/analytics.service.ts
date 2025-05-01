import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket } from '../tickets/entities/ticket.entity';
import { subHours, subDays, subWeeks, subMonths, subYears } from 'date-fns';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepository: Repository<Ticket>,
  ) {}

  async getTotalTickets(conferenceId: number): Promise<number> {
    try {
      return await this.ticketRepository.count({ where: { conferenceId } });
    } catch (error) {
      throw new HttpException(
        'Failed to fetch ticket count',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getFilteredTickets(
    conferenceId: number,
    filter: string,
  ): Promise<{ timestamp: string; ticketCount: number; totalQuantity: number }[]> {
    const now = new Date();
    let startDate: Date;
    let groupBy: string;

    switch (filter) {
      case 'hourly':
        startDate = subHours(now, 24);
        groupBy = 'hour';
        break;
      case 'daily':
        startDate = subDays(now, 7);
        groupBy = 'day';
        break;
      case 'weekly':
        startDate = subWeeks(now, 4);
        groupBy = 'week';
        break;
      case 'monthly':
        startDate = subMonths(now, 12);
        groupBy = 'month';
        break;
      case 'yearly':
        startDate = subYears(now, 5);
        groupBy = 'year';
        break;
      default:
        throw new HttpException(
          'Invalid filter parameter. Valid values: hourly, daily, weekly, monthly, yearly',
          HttpStatus.BAD_REQUEST,
        );
    }

    try {
      const results = await this.ticketRepository
        .createQueryBuilder('ticket')
        .select([
          `DATE_TRUNC('${groupBy}', ticket.purchaseDate) as timestamp`,
          'COUNT(ticket.id) as ticketCount',
          'SUM(ticket.quantity) as totalQuantity',
        ])
        .where('ticket.conferenceId = :conferenceId', { conferenceId })
        .andWhere('ticket.purchaseDate >= :startDate', { startDate })
        .groupBy(`DATE_TRUNC('${groupBy}', ticket.purchaseDate)`)
        .orderBy('timestamp', 'ASC')
        .getRawMany();

      return results.map((result) => ({
        timestamp: result.timestamp.toISOString(),
        ticketCount: parseInt(result.ticketcount, 10),
        totalQuantity: parseInt(result.totalquantity, 10) || 0,
      }));
    } catch (error) {
      throw new HttpException(
        'Failed to fetch filtered tickets',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async exportTickets(
    conferenceId: number,
    format: 'xls' | 'csv',
    filter: string,
    res: Response,
  ): Promise<void> {
    try {
      const data = await this.getFilteredTickets(conferenceId, filter);

      if (format === 'xls') {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ticket Analytics');
        
        worksheet.columns = [
          { header: 'Timestamp', key: 'timestamp', width: 30 },
          { header: 'Ticket Count', key: 'ticketCount', width: 15 },
          { header: 'Total Quantity', key: 'totalQuantity', width: 15 },
          { header: 'Conference ID', key: 'conferenceId', width: 15 },
        ];

        data.forEach((item) => {
          worksheet.addRow({
            timestamp: item.timestamp,
            ticketCount: item.ticketCount,
            totalQuantity: item.totalQuantity,
            conferenceId,
          });
        });

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=ticket_analytics_${conferenceId}.xlsx`,
        );
        await workbook.xlsx.write(res);
        res.end();
      } else {
        let csv = 'Timestamp,Ticket Count,Total Quantity,Conference ID\n';
        data.forEach((item) => {
          csv += `"${item.timestamp}",${item.ticketCount},${item.totalQuantity},${conferenceId}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename=ticket_analytics_${conferenceId}.csv`,
        );
        res.send(csv);
      }
    } catch (error) {
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to generate export',
          error: error.message,
        });
      }
    }
  }
}
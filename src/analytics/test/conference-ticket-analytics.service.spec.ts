import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConferenceTicketAnalyticsService } from '../services/conference-ticket-analytics.service';
import { Ticket } from '../../ticketing/entities/ticket.entity';
import { Conference } from '../../conference/entities/conference.entity';
import {
  TimeFilter,
  ExportFormat,
} from '../dto/conference-ticket-analytics.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';

describe('ConferenceTicketAnalyticsService', () => {
  let service: ConferenceTicketAnalyticsService;
  let ticketRepo: Repository<Ticket>;
  let conferenceRepo: Repository<Conference>;

  const mockTicketRepo = {
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockConferenceRepo = {
    findOne: jest.fn(),
  };

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  const mockConference = {
    id: 1,
    name: 'Test Conference',
    description: 'Test Description',
    startDate: '2024-01-01',
    endDate: '2024-01-03',
  };

  const mockTickets = [
    {
      id: 'ticket-1',
      pricePaid: 100,
      purchaseDate: new Date('2024-01-01T10:00:00Z'),
      conferenceId: '1',
    },
    {
      id: 'ticket-2',
      pricePaid: 150,
      purchaseDate: new Date('2024-01-01T14:00:00Z'),
      conferenceId: '1',
    },
    {
      id: 'ticket-3',
      pricePaid: 200,
      purchaseDate: new Date('2024-01-02T09:00:00Z'),
      conferenceId: '1',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConferenceTicketAnalyticsService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepo,
        },
        {
          provide: getRepositoryToken(Conference),
          useValue: mockConferenceRepo,
        },
      ],
    }).compile();

    service = module.get<ConferenceTicketAnalyticsService>(
      ConferenceTicketAnalyticsService,
    );
    ticketRepo = module.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    conferenceRepo = module.get<Repository<Conference>>(
      getRepositoryToken(Conference),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTotalTickets', () => {
    it('should return total tickets for a conference', async () => {
      mockConferenceRepo.findOne.mockResolvedValue(mockConference);
      mockTicketRepo.find.mockResolvedValue(mockTickets);

      const result = await service.getTotalTickets('1');

      expect(mockConferenceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockTicketRepo.find).toHaveBeenCalledWith({
        where: { conferenceId: '1' },
        select: ['pricePaid'],
      });
      expect(result).toEqual({
        conferenceId: '1',
        totalTickets: 3,
        totalRevenue: 450,
        averageTicketPrice: 150,
      });
    });

    it('should handle zero tickets', async () => {
      mockConferenceRepo.findOne.mockResolvedValue(mockConference);
      mockTicketRepo.find.mockResolvedValue([]);

      const result = await service.getTotalTickets('1');

      expect(result).toEqual({
        conferenceId: '1',
        totalTickets: 0,
        totalRevenue: 0,
        averageTicketPrice: 0,
      });
    });

    it('should throw NotFoundException when conference not found', async () => {
      mockConferenceRepo.findOne.mockResolvedValue(null);

      await expect(service.getTotalTickets('999')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockConferenceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('getTicketAnalytics', () => {
    beforeEach(() => {
      mockConferenceRepo.findOne.mockResolvedValue(mockConference);
      mockTicketRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return analytics data without filter', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '2', conferenceId: '1' },
        { timestamp: '2024-01-02', ticketCount: '1', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service.getTicketAnalytics('1');

      expect(mockConferenceRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockTicketRepo.createQueryBuilder).toHaveBeenCalledWith('ticket');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'ticket.conferenceId = :conferenceId',
        { conferenceId: '1' },
      );
      expect(result).toEqual({
        conferenceId: '1',
        totalTickets: 3,
        filter: undefined,
        data: [
          { timestamp: '2024-01-01', ticketCount: 2, conferenceId: '1' },
          { timestamp: '2024-01-02', ticketCount: 1, conferenceId: '1' },
        ],
        period: expect.objectContaining({
          start: expect.any(String),
          end: expect.any(String),
        }),
      });
    });

    it('should return analytics data with daily filter', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '2', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service.getTicketAnalytics('1', TimeFilter.DAILY);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ticket.purchaseDate BETWEEN :startDate AND :endDate',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
      expect(result.filter).toBe(TimeFilter.DAILY);
    });

    it('should return analytics data with hourly filter', async () => {
      const mockData = [
        {
          timestamp: '2024-01-01T10:00:00',
          ticketCount: '1',
          conferenceId: '1',
        },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service.getTicketAnalytics('1', TimeFilter.HOURLY);

      expect(result.filter).toBe(TimeFilter.HOURLY);
    });

    it('should return analytics data with weekly filter', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service.getTicketAnalytics('1', TimeFilter.WEEKLY);

      expect(result.filter).toBe(TimeFilter.WEEKLY);
    });

    it('should return analytics data with monthly filter', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service.getTicketAnalytics('1', TimeFilter.MONTHLY);

      expect(result.filter).toBe(TimeFilter.MONTHLY);
    });

    it('should return analytics data with yearly filter', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service.getTicketAnalytics('1', TimeFilter.YEARLY);

      expect(result.filter).toBe(TimeFilter.YEARLY);
    });

    it('should throw NotFoundException when conference not found', async () => {
      mockConferenceRepo.findOne.mockResolvedValue(null);

      await expect(service.getTicketAnalytics('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('exportTicketAnalytics', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockConferenceRepo.findOne.mockResolvedValue(mockConference);
      mockTicketRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };
    });

    it('should export data to CSV format', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '2', conferenceId: '1' },
        { timestamp: '2024-01-02', ticketCount: '1', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      await service.exportTicketAnalytics(
        '1',
        ExportFormat.CSV,
        undefined,
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=conference-1-tickets.csv',
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        'timestamp,ticketCount,conferenceId\n2024-01-01,2,1\n2024-01-02,1,1',
      );
    });

    it('should export data to XLS format', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '2', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      await service.exportTicketAnalytics(
        '1',
        ExportFormat.XLS,
        undefined,
        mockResponse as Response,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=conference-1-tickets.xlsx',
      );
    });

    it('should throw BadRequestException for unsupported format', async () => {
      await expect(
        service.exportTicketAnalytics(
          '1',
          'unsupported' as ExportFormat,
          undefined,
          mockResponse as Response,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when conference not found', async () => {
      mockConferenceRepo.findOne.mockResolvedValue(null);

      await expect(
        service.exportTicketAnalytics(
          '999',
          ExportFormat.CSV,
          undefined,
          mockResponse as Response,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should export filtered data', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '2', conferenceId: '1' },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      await service.exportTicketAnalytics(
        '1',
        ExportFormat.CSV,
        TimeFilter.DAILY,
        mockResponse as Response,
      );

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'ticket.purchaseDate BETWEEN :startDate AND :endDate',
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        }),
      );
    });
  });

  describe('getDateRange', () => {
    it('should return correct date range for hourly filter', () => {
      const result = service['getDateRange'](TimeFilter.HOURLY);
      const now = new Date();
      const expectedStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(result.startDate.getTime()).toBeCloseTo(
        expectedStart.getTime(),
        -1000,
      );
      expect(result.endDate.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for daily filter', () => {
      const result = service['getDateRange'](TimeFilter.DAILY);
      const now = new Date();
      const expectedStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(result.startDate.getTime()).toBeCloseTo(
        expectedStart.getTime(),
        -1000,
      );
      expect(result.endDate.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for weekly filter', () => {
      const result = service['getDateRange'](TimeFilter.WEEKLY);
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000,
      );

      expect(result.startDate.getTime()).toBeCloseTo(
        expectedStart.getTime(),
        -1000,
      );
      expect(result.endDate.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for monthly filter', () => {
      const result = service['getDateRange'](TimeFilter.MONTHLY);
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000,
      );

      expect(result.startDate.getTime()).toBeCloseTo(
        expectedStart.getTime(),
        -1000,
      );
      expect(result.endDate.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return correct date range for yearly filter', () => {
      const result = service['getDateRange'](TimeFilter.YEARLY);
      const now = new Date();
      const expectedStart = new Date(
        now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000,
      );

      expect(result.startDate.getTime()).toBeCloseTo(
        expectedStart.getTime(),
        -1000,
      );
      expect(result.endDate.getTime()).toBeCloseTo(now.getTime(), -1000);
    });

    it('should return all-time range when no filter provided', () => {
      const result = service['getDateRange']();

      expect(result.startDate.getTime()).toBe(0);
      expect(result.endDate.getTime()).toBeCloseTo(new Date().getTime(), -1000);
    });
  });

  describe('getFilteredTicketData', () => {
    beforeEach(() => {
      mockTicketRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should call hourly aggregation when filter is hourly', async () => {
      const mockData = [
        {
          timestamp: '2024-01-01T10:00:00',
          ticketCount: '1',
          conferenceId: '1',
        },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service['getFilteredTicketData'](
        '1',
        TimeFilter.HOURLY,
      );

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('hour', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('hour', ticket.purchaseDate)",
      );
      expect(result).toEqual([
        { timestamp: '2024-01-01T10:00:00', ticketCount: 1, conferenceId: '1' },
      ]);
    });

    it('should call daily aggregation when filter is daily', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '2', conferenceId: '1' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service['getFilteredTicketData'](
        '1',
        TimeFilter.DAILY,
      );

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('day', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('day', ticket.purchaseDate)",
      );
      expect(result).toEqual([
        { timestamp: '2024-01-01', ticketCount: 2, conferenceId: '1' },
      ]);
    });

    it('should call weekly aggregation when filter is weekly', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service['getFilteredTicketData'](
        '1',
        TimeFilter.WEEKLY,
      );

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('week', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('week', ticket.purchaseDate)",
      );
      expect(result).toEqual([
        { timestamp: '2024-01-01', ticketCount: 3, conferenceId: '1' },
      ]);
    });

    it('should call monthly aggregation when filter is monthly', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service['getFilteredTicketData'](
        '1',
        TimeFilter.MONTHLY,
      );

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('month', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('month', ticket.purchaseDate)",
      );
      expect(result).toEqual([
        { timestamp: '2024-01-01', ticketCount: 3, conferenceId: '1' },
      ]);
    });

    it('should call yearly aggregation when filter is yearly', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service['getFilteredTicketData'](
        '1',
        TimeFilter.YEARLY,
      );

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('year', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('year', ticket.purchaseDate)",
      );
      expect(result).toEqual([
        { timestamp: '2024-01-01', ticketCount: 3, conferenceId: '1' },
      ]);
    });

    it('should call all-time aggregation when no filter provided', async () => {
      const mockData = [
        { timestamp: '2024-01-01', ticketCount: '3', conferenceId: '1' },
      ];
      mockQueryBuilder.getRawMany.mockResolvedValue(mockData);

      const result = await service['getFilteredTicketData']('1');

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([
        "DATE_TRUNC('day', ticket.purchaseDate) as timestamp",
        'COUNT(*) as ticketCount',
      ]);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith(
        "DATE_TRUNC('day', ticket.purchaseDate)",
      );
      expect(result).toEqual([
        { timestamp: '2024-01-01', ticketCount: 3, conferenceId: '1' },
      ]);
    });
  });
});

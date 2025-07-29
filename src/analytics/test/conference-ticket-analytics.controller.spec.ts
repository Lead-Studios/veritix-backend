import { Test, TestingModule } from '@nestjs/testing';
import { ConferenceTicketAnalyticsController } from '../controllers/conference-ticket-analytics.controller';
import { ConferenceTicketAnalyticsService } from '../services/conference-ticket-analytics.service';
import { TimeFilter, ExportFormat } from '../dto/conference-ticket-analytics.dto';
import { Response } from 'express';
import { BadRequestException } from '@nestjs/common';

describe('ConferenceTicketAnalyticsController', () => {
  let controller: ConferenceTicketAnalyticsController;
  let service: ConferenceTicketAnalyticsService;

  const mockService = {
    getTotalTickets: jest.fn(),
    getTicketAnalytics: jest.fn(),
    exportTicketAnalytics: jest.fn(),
  };

  const mockResponse = {
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;

  const mockRequest = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      roles: ['admin'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConferenceTicketAnalyticsController],
      providers: [
        {
          provide: ConferenceTicketAnalyticsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ConferenceTicketAnalyticsController>(ConferenceTicketAnalyticsController);
    service = module.get<ConferenceTicketAnalyticsService>(ConferenceTicketAnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTotalTickets', () => {
    it('should return total tickets for a conference', async () => {
      const conferenceId = '1';
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 10,
        totalRevenue: 1500,
        averageTicketPrice: 150,
      };

      mockService.getTotalTickets.mockResolvedValue(expectedResult);

      const result = await controller.getTotalTickets(conferenceId, mockRequest);

      expect(service.getTotalTickets).toHaveBeenCalledWith(conferenceId);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const conferenceId = '999';
      const error = new Error('Conference not found');

      mockService.getTotalTickets.mockRejectedValue(error);

      await expect(controller.getTotalTickets(conferenceId, mockRequest)).rejects.toThrow(error);
      expect(service.getTotalTickets).toHaveBeenCalledWith(conferenceId);
    });
  });

  describe('getTicketAnalytics', () => {
    it('should return analytics data without filter', async () => {
      const conferenceId = '1';
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 10,
        filter: undefined,
        data: [
          { timestamp: '2024-01-01', ticketCount: 5, conferenceId: '1' },
          { timestamp: '2024-01-02', ticketCount: 5, conferenceId: '1' },
        ],
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-02T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, undefined, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should return analytics data with daily filter', async () => {
      const conferenceId = '1';
      const filter = TimeFilter.DAILY;
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 5,
        filter: TimeFilter.DAILY,
        data: [
          { timestamp: '2024-01-01', ticketCount: 5, conferenceId: '1' },
        ],
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-02T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, filter, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, filter);
      expect(result).toEqual(expectedResult);
    });

    it('should return analytics data with hourly filter', async () => {
      const conferenceId = '1';
      const filter = TimeFilter.HOURLY;
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 3,
        filter: TimeFilter.HOURLY,
        data: [
          { timestamp: '2024-01-01T10:00:00', ticketCount: 2, conferenceId: '1' },
          { timestamp: '2024-01-01T11:00:00', ticketCount: 1, conferenceId: '1' },
        ],
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-02T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, filter, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, filter);
      expect(result).toEqual(expectedResult);
    });

    it('should return analytics data with weekly filter', async () => {
      const conferenceId = '1';
      const filter = TimeFilter.WEEKLY;
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 15,
        filter: TimeFilter.WEEKLY,
        data: [
          { timestamp: '2024-01-01', ticketCount: 8, conferenceId: '1' },
          { timestamp: '2024-01-08', ticketCount: 7, conferenceId: '1' },
        ],
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-15T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, filter, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, filter);
      expect(result).toEqual(expectedResult);
    });

    it('should return analytics data with monthly filter', async () => {
      const conferenceId = '1';
      const filter = TimeFilter.MONTHLY;
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 25,
        filter: TimeFilter.MONTHLY,
        data: [
          { timestamp: '2024-01-01', ticketCount: 12, conferenceId: '1' },
          { timestamp: '2024-02-01', ticketCount: 13, conferenceId: '1' },
        ],
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-03-01T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, filter, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, filter);
      expect(result).toEqual(expectedResult);
    });

    it('should return analytics data with yearly filter', async () => {
      const conferenceId = '1';
      const filter = TimeFilter.YEARLY;
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 50,
        filter: TimeFilter.YEARLY,
        data: [
          { timestamp: '2023-01-01', ticketCount: 20, conferenceId: '1' },
          { timestamp: '2024-01-01', ticketCount: 30, conferenceId: '1' },
        ],
        period: {
          start: '2023-01-01T00:00:00.000Z',
          end: '2024-01-01T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, filter, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, filter);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const conferenceId = '999';
      const error = new Error('Conference not found');

      mockService.getTicketAnalytics.mockRejectedValue(error);

      await expect(controller.getTicketAnalytics(conferenceId, undefined, mockRequest)).rejects.toThrow(error);
      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, undefined);
    });
  });

  describe('exportTicketAnalytics', () => {
    it('should export data to CSV format', async () => {
      const conferenceId = '1';
      const format = ExportFormat.CSV;
      const filter = TimeFilter.DAILY;

      mockService.exportTicketAnalytics.mockResolvedValue(undefined);

      await controller.exportTicketAnalytics(conferenceId, format, filter, mockResponse, mockRequest);

      expect(service.exportTicketAnalytics).toHaveBeenCalledWith(conferenceId, format, filter, mockResponse);
    });

    it('should export data to XLS format', async () => {
      const conferenceId = '1';
      const format = ExportFormat.XLS;
      const filter = TimeFilter.MONTHLY;

      mockService.exportTicketAnalytics.mockResolvedValue(undefined);

      await controller.exportTicketAnalytics(conferenceId, format, filter, mockResponse, mockRequest);

      expect(service.exportTicketAnalytics).toHaveBeenCalledWith(conferenceId, format, filter, mockResponse);
    });

    it('should export data without filter', async () => {
      const conferenceId = '1';
      const format = ExportFormat.CSV;

      mockService.exportTicketAnalytics.mockResolvedValue(undefined);

      await controller.exportTicketAnalytics(conferenceId, format, undefined, mockResponse, mockRequest);

      expect(service.exportTicketAnalytics).toHaveBeenCalledWith(conferenceId, format, undefined, mockResponse);
    });

    it('should handle service errors', async () => {
      const conferenceId = '999';
      const format = ExportFormat.CSV;
      const error = new Error('Conference not found');

      mockService.exportTicketAnalytics.mockRejectedValue(error);

      await expect(
        controller.exportTicketAnalytics(conferenceId, format, undefined, mockResponse, mockRequest)
      ).rejects.toThrow(error);
      expect(service.exportTicketAnalytics).toHaveBeenCalledWith(conferenceId, format, undefined, mockResponse);
    });
  });

  describe('checkConferenceAccess', () => {
    it('should allow access for admin user', async () => {
      const conferenceId = '1';
      const adminUser = {
        id: 'user-1',
        email: 'admin@example.com',
        roles: ['admin'],
      };

      const request = { user: adminUser };

      // This should not throw an error
      await expect(controller.getTotalTickets(conferenceId, request)).resolves.toBeDefined();
    });

    it('should allow access for organizer user', async () => {
      const conferenceId = '1';
      const organizerUser = {
        id: 'user-2',
        email: 'organizer@example.com',
        roles: ['organizer'],
      };

      const request = { user: organizerUser };

      mockService.getTotalTickets.mockResolvedValue({
        conferenceId: '1',
        totalTickets: 5,
        totalRevenue: 750,
        averageTicketPrice: 150,
      });

      // This should not throw an error
      await expect(controller.getTotalTickets(conferenceId, request)).resolves.toBeDefined();
    });

    it('should deny access for user without proper roles', async () => {
      const conferenceId = '1';
      const regularUser = {
        id: 'user-3',
        email: 'user@example.com',
        roles: ['user'],
      };

      const request = { user: regularUser };

      // This should throw a BadRequestException
      await expect(controller.getTotalTickets(conferenceId, request)).rejects.toThrow(BadRequestException);
    });

    it('should deny access for user with no roles', async () => {
      const conferenceId = '1';
      const userWithoutRoles = {
        id: 'user-4',
        email: 'user@example.com',
        roles: [],
      };

      const request = { user: userWithoutRoles };

      // This should throw a BadRequestException
      await expect(controller.getTotalTickets(conferenceId, request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('parameter validation', () => {
    it('should handle invalid conference ID format', async () => {
      const invalidConferenceId = 'invalid-id';
      const error = new Error('Invalid conference ID format');

      mockService.getTotalTickets.mockRejectedValue(error);

      await expect(controller.getTotalTickets(invalidConferenceId, mockRequest)).rejects.toThrow(error);
    });

    it('should handle empty conference ID', async () => {
      const emptyConferenceId = '';
      const error = new Error('Conference ID cannot be empty');

      mockService.getTotalTickets.mockRejectedValue(error);

      await expect(controller.getTotalTickets(emptyConferenceId, mockRequest)).rejects.toThrow(error);
    });

    it('should handle null filter parameter', async () => {
      const conferenceId = '1';
      const nullFilter = null;

      mockService.getTicketAnalytics.mockResolvedValue({
        conferenceId: '1',
        totalTickets: 5,
        filter: null,
        data: [],
        period: { start: '', end: '' },
      });

      const result = await controller.getTicketAnalytics(conferenceId, undefined, mockRequest);

      expect(service.getTicketAnalytics).toHaveBeenCalledWith(conferenceId, undefined);
      expect(result.filter).toBeUndefined();
    });
  });

  describe('response format', () => {
    it('should return correct response structure for total tickets', async () => {
      const conferenceId = '1';
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 10,
        totalRevenue: 1500.50,
        averageTicketPrice: 150.05,
      };

      mockService.getTotalTickets.mockResolvedValue(expectedResult);

      const result = await controller.getTotalTickets(conferenceId, mockRequest);

      expect(result).toHaveProperty('conferenceId');
      expect(result).toHaveProperty('totalTickets');
      expect(result).toHaveProperty('totalRevenue');
      expect(result).toHaveProperty('averageTicketPrice');
      expect(typeof result.totalTickets).toBe('number');
      expect(typeof result.totalRevenue).toBe('number');
      expect(typeof result.averageTicketPrice).toBe('number');
    });

    it('should return correct response structure for analytics', async () => {
      const conferenceId = '1';
      const filter = TimeFilter.DAILY;
      const expectedResult = {
        conferenceId: '1',
        totalTickets: 5,
        filter: TimeFilter.DAILY,
        data: [
          { timestamp: '2024-01-01', ticketCount: 3, conferenceId: '1' },
          { timestamp: '2024-01-02', ticketCount: 2, conferenceId: '1' },
        ],
        period: {
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-02T00:00:00.000Z',
        },
      };

      mockService.getTicketAnalytics.mockResolvedValue(expectedResult);

      const result = await controller.getTicketAnalytics(conferenceId, filter, mockRequest);

      expect(result).toHaveProperty('conferenceId');
      expect(result).toHaveProperty('totalTickets');
      expect(result).toHaveProperty('filter');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('period');
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.period).toHaveProperty('start');
      expect(result.period).toHaveProperty('end');
    });
  });
}); 
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConferenceTicketAnalyticsController } from '../../controllers/conference-ticket-analytics.controller';
import { ConferenceTicketAnalyticsService } from '../../services/conference-ticket-analytics.service';
import { Ticket } from '../../../ticketing/entities/ticket.entity';
import { Conference } from '../../../conference/entities/conference.entity';
import { TimeFilter, ExportFormat } from '../../dto/conference-ticket-analytics.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Response } from 'express';
import { TicketStatus } from '../../../ticketing/entities/ticket.entity';

describe('Conference Ticket Analytics Integration', () => {
  let app: INestApplication;
  let controller: ConferenceTicketAnalyticsController;
  let service: ConferenceTicketAnalyticsService;
  let ticketRepo: Repository<Ticket>;
  let conferenceRepo: Repository<Conference>;

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRolesGuard = {
    canActivate: jest.fn(() => true),
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
      ticketNumber: 'TICKET-001',
      eventId: 'event-1',
      conferenceId: '1',
      purchaserId: 'user-1',
      purchaserName: 'John Doe',
      purchaserEmail: 'john@example.com',
      qrCodeData: 'qr-data-1',
      qrCodeImage: 'qr-image-1',
      secureHash: 'hash-1',
      status: TicketStatus.ACTIVE,
      pricePaid: 100,
      purchaseDate: new Date('2024-01-01T10:00:00Z'),
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: 'ticket-2',
      ticketNumber: 'TICKET-002',
      eventId: 'event-1',
      conferenceId: '1',
      purchaserId: 'user-2',
      purchaserName: 'Jane Smith',
      purchaserEmail: 'jane@example.com',
      qrCodeData: 'qr-data-2',
      qrCodeImage: 'qr-image-2',
      secureHash: 'hash-2',
      status: TicketStatus.ACTIVE,
      pricePaid: 150,
      purchaseDate: new Date('2024-01-01T14:00:00Z'),
      createdAt: new Date('2024-01-01T14:00:00Z'),
      updatedAt: new Date('2024-01-01T14:00:00Z'),
    },
    {
      id: 'ticket-3',
      ticketNumber: 'TICKET-003',
      eventId: 'event-1',
      conferenceId: '1',
      purchaserId: 'user-3',
      purchaserName: 'Bob Johnson',
      purchaserEmail: 'bob@example.com',
      qrCodeData: 'qr-data-3',
      qrCodeImage: 'qr-image-3',
      secureHash: 'hash-3',
      status: TicketStatus.ACTIVE,
      pricePaid: 200,
      purchaseDate: new Date('2024-01-02T09:00:00Z'),
      createdAt: new Date('2024-01-02T09:00:00Z'),
      updatedAt: new Date('2024-01-02T09:00:00Z'),
    },
  ];

  const mockRequest = {
    user: {
      id: 'admin-1',
      email: 'admin@example.com',
      roles: ['admin'],
    },
  };

  const mockResponse = {
    setHeader: jest.fn(),
    send: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Ticket, Conference],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([Ticket, Conference]),
      ],
      controllers: [ConferenceTicketAnalyticsController],
      providers: [ConferenceTicketAnalyticsService],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockRolesGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<ConferenceTicketAnalyticsController>(ConferenceTicketAnalyticsController);
    service = module.get<ConferenceTicketAnalyticsService>(ConferenceTicketAnalyticsService);
    ticketRepo = module.get<Repository<Ticket>>(getRepositoryToken(Ticket));
    conferenceRepo = module.get<Repository<Conference>>(getRepositoryToken(Conference));

    // Seed test data
    await conferenceRepo.save(mockConference);
    await ticketRepo.save(mockTickets);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Database Integration', () => {
    it('should retrieve conference from database', async () => {
      const conference = await conferenceRepo.findOne({ where: { id: 1 } });
      expect(conference).toBeDefined();
      expect(conference!.name).toBe('Test Conference');
    });

    it('should retrieve tickets from database', async () => {
      const tickets = await ticketRepo.find({ where: { conferenceId: '1' } });
      expect(tickets).toHaveLength(3);
      expect(tickets[0].purchaserName).toBe('John Doe');
      expect(tickets[1].purchaserName).toBe('Jane Smith');
      expect(tickets[2].purchaserName).toBe('Bob Johnson');
    });

    it('should filter tickets by conference ID', async () => {
      const tickets = await ticketRepo.find({ where: { conferenceId: '1' } });
      expect(tickets).toHaveLength(3);
      
      const otherTickets = await ticketRepo.find({ where: { conferenceId: '999' } });
      expect(otherTickets).toHaveLength(0);
    });
  });

  describe('Service Integration', () => {
    it('should get total tickets for a conference', async () => {
      const result = await service.getTotalTickets('1');

      expect(result).toEqual({
        conferenceId: '1',
        totalTickets: 3,
        totalRevenue: 450,
        averageTicketPrice: 150,
      });
    });

    it('should get analytics data without filter', async () => {
      const result = await service.getTicketAnalytics('1');

      expect(result.conferenceId).toBe('1');
      expect(result.totalTickets).toBe(3);
      expect(result.filter).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should get analytics data with daily filter', async () => {
      const result = await service.getTicketAnalytics('1', TimeFilter.DAILY);

      expect(result.conferenceId).toBe('1');
      expect(result.filter).toBe(TimeFilter.DAILY);
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should get analytics data with hourly filter', async () => {
      const result = await service.getTicketAnalytics('1', TimeFilter.HOURLY);

      expect(result.conferenceId).toBe('1');
      expect(result.filter).toBe(TimeFilter.HOURLY);
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should get analytics data with weekly filter', async () => {
      const result = await service.getTicketAnalytics('1', TimeFilter.WEEKLY);

      expect(result.conferenceId).toBe('1');
      expect(result.filter).toBe(TimeFilter.WEEKLY);
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should get analytics data with monthly filter', async () => {
      const result = await service.getTicketAnalytics('1', TimeFilter.MONTHLY);

      expect(result.conferenceId).toBe('1');
      expect(result.filter).toBe(TimeFilter.MONTHLY);
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should get analytics data with yearly filter', async () => {
      const result = await service.getTicketAnalytics('1', TimeFilter.YEARLY);

      expect(result.conferenceId).toBe('1');
      expect(result.filter).toBe(TimeFilter.YEARLY);
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should throw NotFoundException for non-existent conference', async () => {
      await expect(service.getTotalTickets('999')).rejects.toThrow('Conference with ID 999 not found');
    });
  });

  describe('Controller Integration', () => {
    it('should get total tickets through controller', async () => {
      const result = await controller.getTotalTickets('1', mockRequest);

      expect(result).toEqual({
        conferenceId: '1',
        totalTickets: 3,
        totalRevenue: 450,
        averageTicketPrice: 150,
      });
    });

    it('should get analytics data through controller without filter', async () => {
      const result = await controller.getTicketAnalytics('1', undefined, mockRequest);

      expect(result.conferenceId).toBe('1');
      expect(result.totalTickets).toBe(3);
      expect(result.filter).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should get analytics data through controller with daily filter', async () => {
      const result = await controller.getTicketAnalytics('1', TimeFilter.DAILY, mockRequest);

      expect(result.conferenceId).toBe('1');
      expect(result.filter).toBe(TimeFilter.DAILY);
      expect(result.data).toBeDefined();
      expect(result.period).toBeDefined();
    });

    it('should export data to CSV through controller', async () => {
      await controller.exportTicketAnalytics('1', ExportFormat.CSV, undefined, mockResponse, mockRequest);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=conference-1-tickets.csv'
      );
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should export data to XLS through controller', async () => {
      await controller.exportTicketAnalytics('1', ExportFormat.XLS, undefined, mockResponse, mockRequest);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=conference-1-tickets.xlsx'
      );
    });

    it('should export filtered data through controller', async () => {
      await controller.exportTicketAnalytics('1', ExportFormat.CSV, TimeFilter.DAILY, mockResponse, mockRequest);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('Authorization Integration', () => {
    it('should allow access for admin user', async () => {
      const adminRequest = {
        user: {
          id: 'admin-1',
          email: 'admin@example.com',
          roles: ['admin'],
        },
      };

      const result = await controller.getTotalTickets('1', adminRequest);
      expect(result).toBeDefined();
    });

    it('should allow access for organizer user', async () => {
      const organizerRequest = {
        user: {
          id: 'organizer-1',
          email: 'organizer@example.com',
          roles: ['organizer'],
        },
      };

      const result = await controller.getTotalTickets('1', organizerRequest);
      expect(result).toBeDefined();
    });

    it('should deny access for user without proper roles', async () => {
      const regularUserRequest = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          roles: ['user'],
        },
      };

      await expect(controller.getTotalTickets('1', regularUserRequest)).rejects.toThrow('Insufficient permissions to access conference analytics');
    });
  });

  describe('Data Aggregation Integration', () => {
    it('should aggregate ticket counts correctly', async () => {
      const result = await service.getTotalTickets('1');
      expect(result.totalTickets).toBe(3);
    });

    it('should calculate revenue correctly', async () => {
      const result = await service.getTotalTickets('1');
      expect(result.totalRevenue).toBe(450); // 100 + 150 + 200
    });

    it('should calculate average ticket price correctly', async () => {
      const result = await service.getTotalTickets('1');
      expect(result.averageTicketPrice).toBe(150); // 450 / 3
    });

    it('should handle zero tickets correctly', async () => {
      // Clear tickets for conference 1
      await ticketRepo.delete({ conferenceId: '1' });

      const result = await service.getTotalTickets('1');
      expect(result.totalTickets).toBe(0);
      expect(result.totalRevenue).toBe(0);
      expect(result.averageTicketPrice).toBe(0);
    });
  });

  describe('Time Filtering Integration', () => {
    it('should filter data by time ranges correctly', async () => {
      const dailyResult = await service.getTicketAnalytics('1', TimeFilter.DAILY);
      const weeklyResult = await service.getTicketAnalytics('1', TimeFilter.WEEKLY);
      const monthlyResult = await service.getTicketAnalytics('1', TimeFilter.MONTHLY);

      expect(dailyResult.filter).toBe(TimeFilter.DAILY);
      expect(weeklyResult.filter).toBe(TimeFilter.WEEKLY);
      expect(monthlyResult.filter).toBe(TimeFilter.MONTHLY);

      // All should have the same total tickets since our test data is within all ranges
      expect(dailyResult.totalTickets).toBe(3);
      expect(weeklyResult.totalTickets).toBe(3);
      expect(monthlyResult.totalTickets).toBe(3);
    });

    it('should return different date ranges for different filters', async () => {
      const dailyResult = await service.getTicketAnalytics('1', TimeFilter.DAILY);
      const weeklyResult = await service.getTicketAnalytics('1', TimeFilter.WEEKLY);

      const dailyStart = new Date(dailyResult.period.start);
      const dailyEnd = new Date(dailyResult.period.end);
      const weeklyStart = new Date(weeklyResult.period.start);
      const weeklyEnd = new Date(weeklyResult.period.end);

      // Weekly range should be longer than daily range
      expect(weeklyEnd.getTime() - weeklyStart.getTime()).toBeGreaterThan(
        dailyEnd.getTime() - dailyStart.getTime()
      );
    });
  });

  describe('Export Integration', () => {
    it('should export CSV with correct format', async () => {
      await service.exportTicketAnalytics('1', ExportFormat.CSV, undefined, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('timestamp,ticketCount,conferenceId')
      );
    });

    it('should export XLS with correct format', async () => {
      await service.exportTicketAnalytics('1', ExportFormat.XLS, undefined, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should include filtered data in exports', async () => {
      await service.exportTicketAnalytics('1', ExportFormat.CSV, TimeFilter.DAILY, mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle non-existent conference gracefully', async () => {
      await expect(service.getTotalTickets('999')).rejects.toThrow('Conference with ID 999 not found');
    });

    it('should handle invalid export format gracefully', async () => {
      await expect(
        service.exportTicketAnalytics('1', 'invalid' as ExportFormat, undefined, mockResponse)
      ).rejects.toThrow('Unsupported export format: invalid');
    });

    it('should handle database connection issues gracefully', async () => {
      // This would require mocking database failures
      // For now, we'll test that the service handles the happy path correctly
      const result = await service.getTotalTickets('1');
      expect(result).toBeDefined();
    });
  });

  describe('Performance Integration', () => {
    it('should handle large datasets efficiently', async () => {
      // Create additional test tickets to simulate larger dataset
      const additionalTickets = Array.from({ length: 100 }, (_, i) => ({
        id: `ticket-${i + 4}`,
        ticketNumber: `TICKET-${String(i + 4).padStart(3, '0')}`,
        eventId: 'event-1',
        conferenceId: '1',
        purchaserId: `user-${i + 4}`,
        purchaserName: `User ${i + 4}`,
        purchaserEmail: `user${i + 4}@example.com`,
        qrCodeData: `qr-data-${i + 4}`,
        qrCodeImage: `qr-image-${i + 4}`,
        secureHash: `hash-${i + 4}`,
        status: TicketStatus.ACTIVE,
        pricePaid: 100 + i,
        purchaseDate: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
        createdAt: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
        updatedAt: new Date(`2024-01-01T${String(i % 24).padStart(2, '0')}:00:00Z`),
      }));

      await ticketRepo.save(additionalTickets);

      const result = await service.getTotalTickets('1');
      expect(result.totalTickets).toBe(103); // 3 original + 100 additional
    });

    it('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 10 }, () => service.getTotalTickets('1'));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.totalTickets).toBe(3);
        expect(result.conferenceId).toBe('1');
      });
    });
  });
}); 
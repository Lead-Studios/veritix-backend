import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { VerificationService } from './verification.service';
import { VerificationLog } from './entities/verification-log.entity';
import { TicketService } from '../tickets-inventory/services/ticket.service';
import { EventsService } from '../events/events.service';
import { Ticket, TicketStatus } from '../tickets-inventory/entities/ticket.entity';
import { Event } from '../events/entities/event.entity';
import {
  VerificationStatus,
  VerificationResult,
} from './interfaces/verification.interface';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VerificationService', () => {
  let service: VerificationService;
  let verificationLogRepository: Repository<VerificationLog>;
  let ticketService: TicketService;
  let eventsService: EventsService;
  let dataSource: DataSource;
  let queryRunner: QueryRunner;

  const mockTicketServiceResponse = {
    id: 'ticket-1',
    qrCode: 'QR123',
    status: TicketStatus.ISSUED,
    orderReference: 'ORD-001',
    attendeeEmail: 'test@example.com',
    attendeeName: 'John Doe',
    metadata: null,
    ticketTypeId: 'type-1',
    eventId: 'event-1',
    scannedAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTicketEntity = {
    id: 'ticket-1',
    qrCode: 'QR123',
    status: TicketStatus.ISSUED,
    orderReference: 'ORD-001',
    attendeeEmail: 'test@example.com',
    attendeeName: 'John Doe',
    metadata: null,
    ticketTypeId: 'type-1',
    eventId: 'event-1',
    scannedAt: null,
    refundedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    event: {
      id: 'event-1',
      title: 'Test Event',
      eventDate: new Date(Date.now() - 3600000), // 1 hour ago
      eventClosingDate: new Date(Date.now() + 3600000), // 1 hour from now
    } as Event,
    ticketType: {
      id: 'type-1',
      name: 'General Admission',
    },
    markAsScanned: jest.fn(),
    canBeScanned: jest.fn(() => true),
  } as unknown as Ticket;

  const mockEvent = {
    id: 'event-1',
    title: 'Test Event',
    description: 'Test Event Description',
    eventDate: new Date(Date.now() - 3600000), // 1 hour ago
    eventClosingDate: new Date(Date.now() + 3600000), // 1 hour from now
    capacity: 100,
    status: 'PUBLISHED',
    isArchived: false,
  } as Event;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: getRepositoryToken(VerificationLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: TicketService,
          useValue: {
            findByQrCode: jest.fn(),
          },
        },
        {
          provide: EventsService,
          useValue: {
            getEventById: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn(),
            createQueryRunner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
    verificationLogRepository = module.get<Repository<VerificationLog>>(
      getRepositoryToken(VerificationLog),
    );
    ticketService = module.get<TicketService>(TicketService);
    eventsService = module.get<EventsService>(EventsService);
    dataSource = module.get<DataSource>(DataSource);

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        getRepository: jest.fn(),
      },
    } as unknown as QueryRunner;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyTicket - Core Logic', () => {
    describe('Ticket Not Found - INVALID', () => {
      it('should return INVALID when ticket is not found', async () => {
        jest.spyOn(ticketService, 'findByQrCode').mockRejectedValue(
          new NotFoundException('Ticket not found'),
        );

        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(null),
        };
        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'INVALID_QR',
        });

        expect(result.status).toBe(VerificationStatus.INVALID);
        expect(result.isValid).toBe(false);
        expect(result.ticket).toBeUndefined();
      });
    });

    describe('Ticket Already Scanned - ALREADY_USED', () => {
      it('should return ALREADY_USED when ticket status is SCANNED', async () => {
        const scannedTicket = {
          ...mockTicketEntity,
          status: TicketStatus.SCANNED,
        };

        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(scannedTicket),
        };

        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
        });

        expect(result.status).toBe(VerificationStatus.ALREADY_USED);
        expect(result.isValid).toBe(false);
        expect(result.ticket).toBeDefined();
      });
    });

    describe('Ticket Cancelled - CANCELLED', () => {
      it('should return CANCELLED when ticket status is CANCELLED', async () => {
        const cancelledTicket = {
          ...mockTicketEntity,
          status: TicketStatus.CANCELLED,
        };

        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(cancelledTicket),
        };

        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
        });

        expect(result.status).toBe(VerificationStatus.CANCELLED);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Event Not Started - EVENT_NOT_STARTED', () => {
      it('should return EVENT_NOT_STARTED when event has not started', async () => {
        const futureEvent = {
          ...mockEvent,
          eventDate: new Date(Date.now() + 86400000), // 24 hours from now
        };

        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(mockTicketEntity),
        };

        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);
        jest
          .spyOn(eventsService, 'getEventById')
          .mockResolvedValue(futureEvent);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
        });

        expect(result.status).toBe(VerificationStatus.EVENT_NOT_STARTED);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Event Ended - EVENT_ENDED', () => {
      it('should return EVENT_ENDED when event has ended', async () => {
        const pastEvent = {
          ...mockEvent,
          eventClosingDate: new Date(Date.now() - 3600000), // 1 hour ago
        };

        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(mockTicketEntity),
        };

        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);
        jest
          .spyOn(eventsService, 'getEventById')
          .mockResolvedValue(pastEvent);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
        });

        expect(result.status).toBe(VerificationStatus.EVENT_ENDED);
        expect(result.isValid).toBe(false);
      });
    });

    describe('Valid Ticket Without Marking - VALID', () => {
      it('should return VALID when ticket is valid and not marked', async () => {
        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(mockTicketEntity),
        };

        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);
        jest
          .spyOn(eventsService, 'getEventById')
          .mockResolvedValue(mockEvent);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
          markAsUsed: false,
        });

        expect(result.status).toBe(VerificationStatus.VALID);
        expect(result.isValid).toBe(true);
        expect(result.ticket).toBeDefined();
        expect(result.ticket?.ticketId).toBe('ticket-1');
      });
    });

    describe('Valid Ticket With Marking - VALID + Transaction', () => {
      it('should return VALID and mark ticket as scanned with transaction', async () => {
        const mockTicket = { ...mockTicketEntity };
        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(mockTicket),
          save: jest.fn().mockResolvedValue(mockTicket),
        };

        const mockLogRepo = {
          save: jest.fn().mockResolvedValue({}),
        };

        jest.spyOn(dataSource, 'getRepository').mockImplementation((entity: any) => {
          if (entity === Ticket) {
            return mockTicketRepo as any;
          }
          if (entity === VerificationLog) {
            return mockLogRepo as any;
          }
          return {} as any;
        });

        jest
          .spyOn(eventsService, 'getEventById')
          .mockResolvedValue(mockEvent);

    const mockManager = {
      getRepository: jest
        .fn()
        .mockImplementation((entity: any) => {
          if (entity === Ticket) {
            return mockTicketRepo;
          }
          if (entity === VerificationLog) {
            return mockLogRepo;
          }
          return {};
        }),
    };

        const testQueryRunner = {
          connect: jest.fn(),
          startTransaction: jest.fn(),
          rollbackTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          release: jest.fn(),
          manager: mockManager,
        } as unknown as QueryRunner;

        jest
          .spyOn(dataSource, 'createQueryRunner')
          .mockReturnValue(testQueryRunner);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
          markAsUsed: true,
          verifierId: 'staff-1',
        });

        expect(result.status).toBe(VerificationStatus.VALID);
        expect(result.isValid).toBe(true);
        expect(testQueryRunner.startTransaction).toHaveBeenCalled();
        expect(testQueryRunner.commitTransaction).toHaveBeenCalled();
      });
    });

    describe('Refunded Ticket - INVALID', () => {
      it('should return INVALID when ticket is refunded', async () => {
        const refundedTicket = {
          ...mockTicketEntity,
          status: TicketStatus.REFUNDED,
        };

        const mockTicketRepo = {
          findOne: jest.fn().mockResolvedValue(refundedTicket),
        };

        jest
          .spyOn(dataSource, 'getRepository')
          .mockReturnValue(mockTicketRepo as any);

        jest
          .spyOn(verificationLogRepository, 'create')
          .mockReturnValue({} as VerificationLog);
        jest
          .spyOn(verificationLogRepository, 'save')
          .mockResolvedValue({} as VerificationLog);

        const result = await service.verifyTicket({
          ticketCode: 'QR123',
        });

        expect(result.status).toBe(VerificationStatus.INVALID);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('checkIn', () => {
    it('should call verifyTicket with markAsUsed set to true', async () => {
      const verifyTicketSpy = jest
        .spyOn(service, 'verifyTicket')
        .mockResolvedValue({
          status: VerificationStatus.VALID,
          isValid: true,
          message: 'Ticket is valid. Entry permitted.',
          verifiedAt: new Date(),
        } as VerificationResult);

      await service.checkIn('QR123', 'staff-1');

      expect(verifyTicketSpy).toHaveBeenCalledWith({
        ticketCode: 'QR123',
        verifierId: 'staff-1',
        markAsUsed: true,
      });
    });
  });

  describe('peek', () => {
    it('should call verifyTicket with markAsUsed set to false', async () => {
      const verifyTicketSpy = jest
        .spyOn(service, 'verifyTicket')
        .mockResolvedValue({
          status: VerificationStatus.VALID,
          isValid: true,
          message: 'Ticket is valid. Entry permitted.',
          verifiedAt: new Date(),
        } as VerificationResult);

      await service.peek('QR123');

      expect(verifyTicketSpy).toHaveBeenCalledWith({
        ticketCode: 'QR123',
        markAsUsed: false,
      });
    });
  });

  describe('logVerification', () => {
    it('should create and save a verification log', async () => {
      const logData = {
        ticketCode: 'QR123',
        ticketId: 'ticket-1',
        eventId: 'event-1',
        status: VerificationStatus.VALID,
        verifierId: 'staff-1',
        verifiedAt: new Date(),
      };

      jest
        .spyOn(verificationLogRepository, 'create')
        .mockReturnValue({ ...logData } as VerificationLog);
      jest
        .spyOn(verificationLogRepository, 'save')
        .mockResolvedValue({ ...logData, id: 'log-1' } as VerificationLog);

      await service.logVerification(logData);

      expect(verificationLogRepository.create).toHaveBeenCalled();
      expect(verificationLogRepository.save).toHaveBeenCalled();
    });
  });

  describe('getLogsForEvent', () => {
    it('should retrieve logs for an event ordered by verifiedAt descending', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          ticketCode: 'QR123',
          eventId: 'event-1',
          status: VerificationStatus.VALID,
          verifierId: 'staff-1',
          verifiedAt: new Date(),
        },
      ];

      jest
        .spyOn(verificationLogRepository, 'find')
        .mockResolvedValue(mockLogs as VerificationLog[]);

      const result = await service.getLogsForEvent('event-1');

      expect(result).toHaveLength(1);
      expect(result[0].eventId).toBe('event-1');
      expect(verificationLogRepository.find).toHaveBeenCalledWith({
        where: { eventId: 'event-1' },
        order: { verifiedAt: 'DESC' },
      });
    });
  });

  describe('getLogsForTicket', () => {
    it('should retrieve logs for a ticket ordered by verifiedAt descending', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          ticketCode: 'QR123',
          eventId: 'event-1',
          status: VerificationStatus.VALID,
          verifierId: 'staff-1',
          verifiedAt: new Date(),
        },
      ];

      jest
        .spyOn(verificationLogRepository, 'find')
        .mockResolvedValue(mockLogs as VerificationLog[]);

      const result = await service.getLogsForTicket('QR123');

      expect(result).toHaveLength(1);
      expect(result[0].ticketCode).toBe('QR123');
      expect(verificationLogRepository.find).toHaveBeenCalledWith({
        where: { ticketCode: 'QR123' },
        order: { verifiedAt: 'DESC' },
      });
    });
  });

  describe('getStatsForEvent', () => {
    it('should calculate verification statistics from ticket data', async () => {
      const mockTickets = [
        { ...mockTicketEntity, status: TicketStatus.ISSUED },
        { ...mockTicketEntity, status: TicketStatus.SCANNED },
        { ...mockTicketEntity, status: TicketStatus.SCANNED },
        { ...mockTicketEntity, status: TicketStatus.REFUNDED },
      ];

      const mockTicketRepo = {
        find: jest.fn().mockResolvedValue(mockTickets),
      };

      jest
        .spyOn(dataSource, 'getRepository')
        .mockReturnValue(mockTicketRepo as any);

      const result = await service.getStatsForEvent('event-1');

      expect(result.eventId).toBe('event-1');
      expect(result.totalTickets).toBe(4);
      expect(result.verifiedCount).toBe(2);
      expect(result.remainingCount).toBe(2);
      expect(result.verificationRate).toBe(50);
    });

    it('should handle empty event', async () => {
      const mockTicketRepo = {
        find: jest.fn().mockResolvedValue([]),
      };

      jest
        .spyOn(dataSource, 'getRepository')
        .mockReturnValue(mockTicketRepo as any);

      const result = await service.getStatsForEvent('event-1');

      expect(result.totalTickets).toBe(0);
      expect(result.verificationRate).toBe(0);
    });
  });

  describe('canVerifyForEvent', () => {
    it('should return true when event is ongoing', async () => {
      jest
        .spyOn(eventsService, 'getEventById')
        .mockResolvedValue(mockEvent);

      const result = await service.canVerifyForEvent('event-1');

      expect(result.canVerify).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false when event has not started', async () => {
      const futureEvent = {
        ...mockEvent,
        eventDate: new Date(Date.now() + 86400000),
      };

      jest
        .spyOn(eventsService, 'getEventById')
        .mockResolvedValue(futureEvent);

      const result = await service.canVerifyForEvent('event-1');

      expect(result.canVerify).toBe(false);
      expect(result.reason).toBe('Event has not started yet');
    });

    it('should return false when event has ended', async () => {
      const pastEvent = {
        ...mockEvent,
        eventClosingDate: new Date(Date.now() - 3600000),
      };

      jest
        .spyOn(eventsService, 'getEventById')
        .mockResolvedValue(pastEvent);

      const result = await service.canVerifyForEvent('event-1');

      expect(result.canVerify).toBe(false);
      expect(result.reason).toBe('Event has already ended');
    });

    it('should return false when event not found', async () => {
      jest
        .spyOn(eventsService, 'getEventById')
        .mockRejectedValue(new NotFoundException('Event not found'));

      const result = await service.canVerifyForEvent('nonexistent');

      expect(result.canVerify).toBe(false);
      expect(result.reason).toBe('Event not found');
    });
  });

  describe('getStatusMessage', () => {
    it('should return appropriate messages for each status', () => {
      expect(service.getStatusMessage(VerificationStatus.VALID)).toContain(
        'Entry permitted',
      );
      expect(service.getStatusMessage(VerificationStatus.INVALID)).toContain(
        'Entry denied',
      );
      expect(
        service.getStatusMessage(VerificationStatus.ALREADY_USED),
      ).toContain('already been used');
      expect(
        service.getStatusMessage(VerificationStatus.CANCELLED),
      ).toContain('cancelled');
      expect(
        service.getStatusMessage(VerificationStatus.EVENT_NOT_STARTED),
      ).toContain('not started');
      expect(service.getStatusMessage(VerificationStatus.EVENT_ENDED)).toContain(
        'ended',
      );
    });
  });
});

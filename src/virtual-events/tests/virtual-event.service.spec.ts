import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualEventService } from '../services/virtual-event.service';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { VirtualTicket } from '../entities/virtual-ticket.entity';
import { StreamingPlatformService } from '../services/streaming-platform.service';
import { VirtualEventStatus, EventType, StreamingPlatform } from '../enums/virtual-event.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VirtualEventService', () => {
  let service: VirtualEventService;
  let virtualEventRepository: Repository<VirtualEvent>;
  let attendeeRepository: Repository<VirtualEventAttendee>;
  let virtualTicketRepository: Repository<VirtualTicket>;
  let streamingPlatformService: StreamingPlatformService;

  const mockVirtualEvent = {
    id: 'test-event-id',
    eventType: EventType.VIRTUAL,
    streamingPlatform: StreamingPlatform.ZOOM,
    status: VirtualEventStatus.SCHEDULED,
    eventId: 'main-event-id',
    maxAttendees: 100,
    currentAttendees: 0,
    peakAttendees: 0,
    allowChat: true,
    allowPolls: true,
    allowQA: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAttendee = {
    id: 'attendee-id',
    virtualEventId: 'test-event-id',
    userId: 'user-id',
    joinedAt: new Date(),
    leftAt: null,
    totalDuration: 0,
    isHost: false,
    isModerator: false,
    networkingStatus: 'available',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualEventService,
        {
          provide: getRepositoryToken(VirtualEvent),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            decrement: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualEventAttendee),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualTicket),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: StreamingPlatformService,
          useValue: {
            createStreamingSession: jest.fn(),
            updateStreamingSession: jest.fn(),
            deleteStreamingSession: jest.fn(),
            startStreaming: jest.fn(),
            stopStreaming: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VirtualEventService>(VirtualEventService);
    virtualEventRepository = module.get<Repository<VirtualEvent>>(getRepositoryToken(VirtualEvent));
    attendeeRepository = module.get<Repository<VirtualEventAttendee>>(getRepositoryToken(VirtualEventAttendee));
    virtualTicketRepository = module.get<Repository<VirtualTicket>>(getRepositoryToken(VirtualTicket));
    streamingPlatformService = module.get<StreamingPlatformService>(StreamingPlatformService);
  });

  describe('create', () => {
    it('should create a virtual event successfully', async () => {
      const createDto = {
        eventType: EventType.VIRTUAL,
        streamingPlatform: StreamingPlatform.ZOOM,
        eventId: 'main-event-id',
        platformCredentials: { apiKey: 'test-key' },
      };

      const streamingSession = {
        sessionId: 'session-id',
        streamUrl: 'https://zoom.us/j/123',
        meetingId: '123',
        password: 'password',
      };

      jest.spyOn(virtualEventRepository, 'create').mockReturnValue(mockVirtualEvent as any);
      jest.spyOn(streamingPlatformService, 'createStreamingSession').mockResolvedValue(streamingSession);
      jest.spyOn(virtualEventRepository, 'save').mockResolvedValue(mockVirtualEvent as any);

      const result = await service.create(createDto as any);

      expect(virtualEventRepository.create).toHaveBeenCalledWith(createDto);
      expect(streamingPlatformService.createStreamingSession).toHaveBeenCalled();
      expect(virtualEventRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockVirtualEvent);
    });

    it('should handle streaming platform errors gracefully', async () => {
      const createDto = {
        eventType: EventType.VIRTUAL,
        streamingPlatform: StreamingPlatform.ZOOM,
        eventId: 'main-event-id',
        platformCredentials: { apiKey: 'invalid-key' },
      };

      jest.spyOn(virtualEventRepository, 'create').mockReturnValue(mockVirtualEvent as any);
      jest.spyOn(streamingPlatformService, 'createStreamingSession').mockRejectedValue(new Error('Invalid credentials'));

      await expect(service.create(createDto as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should return a virtual event if found', async () => {
      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);

      const result = await service.findOne('test-event-id');

      expect(virtualEventRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-event-id' },
        relations: ['attendees', 'recordings', 'breakoutRooms', 'interactions'],
      });
      expect(result).toEqual(mockVirtualEvent);
    });

    it('should throw NotFoundException if event not found', async () => {
      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('startEvent', () => {
    it('should start a virtual event successfully', async () => {
      const eventToStart = { ...mockVirtualEvent, status: VirtualEventStatus.SCHEDULED };
      const startedEvent = { ...mockVirtualEvent, status: VirtualEventStatus.LIVE, isLive: true };

      jest.spyOn(service, 'findOne').mockResolvedValue(eventToStart as any);
      jest.spyOn(streamingPlatformService, 'startStreaming').mockResolvedValue(undefined);
      jest.spyOn(virtualEventRepository, 'save').mockResolvedValue(startedEvent as any);

      const result = await service.startEvent('test-event-id');

      expect(streamingPlatformService.startStreaming).toHaveBeenCalled();
      expect(result.status).toBe(VirtualEventStatus.LIVE);
      expect(result.isLive).toBe(true);
    });

    it('should throw error if event is already live', async () => {
      const liveEvent = { ...mockVirtualEvent, status: VirtualEventStatus.LIVE };

      jest.spyOn(service, 'findOne').mockResolvedValue(liveEvent as any);

      await expect(service.startEvent('test-event-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinEvent', () => {
    it('should allow user to join event successfully', async () => {
      const liveEvent = { ...mockVirtualEvent, status: VirtualEventStatus.LIVE, currentAttendees: 5 };

      jest.spyOn(service, 'findOne').mockResolvedValue(liveEvent as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(attendeeRepository, 'create').mockReturnValue(mockAttendee as any);
      jest.spyOn(attendeeRepository, 'save').mockResolvedValue(mockAttendee as any);
      jest.spyOn(virtualEventRepository, 'increment').mockResolvedValue(undefined as any);
      jest.spyOn(service, 'findOne').mockResolvedValue({ ...liveEvent, currentAttendees: 6 } as any);
      jest.spyOn(virtualEventRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.joinEvent('test-event-id', 'user-id');

      expect(attendeeRepository.save).toHaveBeenCalled();
      expect(virtualEventRepository.increment).toHaveBeenCalledWith(
        { id: 'test-event-id' },
        'currentAttendees',
        1
      );
      expect(result).toEqual(mockAttendee);
    });

    it('should throw error if event is not live', async () => {
      const scheduledEvent = { ...mockVirtualEvent, status: VirtualEventStatus.SCHEDULED };

      jest.spyOn(service, 'findOne').mockResolvedValue(scheduledEvent as any);

      await expect(service.joinEvent('test-event-id', 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if event is at capacity', async () => {
      const fullEvent = { ...mockVirtualEvent, status: VirtualEventStatus.LIVE, maxAttendees: 10, currentAttendees: 10 };

      jest.spyOn(service, 'findOne').mockResolvedValue(fullEvent as any);

      await expect(service.joinEvent('test-event-id', 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user is already in event', async () => {
      const liveEvent = { ...mockVirtualEvent, status: VirtualEventStatus.LIVE };

      jest.spyOn(service, 'findOne').mockResolvedValue(liveEvent as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(mockAttendee as any);

      await expect(service.joinEvent('test-event-id', 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveEvent', () => {
    it('should allow user to leave event successfully', async () => {
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(mockAttendee as any);
      jest.spyOn(attendeeRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(virtualEventRepository, 'decrement').mockResolvedValue(undefined as any);

      await service.leaveEvent('test-event-id', 'user-id');

      expect(attendeeRepository.update).toHaveBeenCalledWith(
        mockAttendee.id,
        expect.objectContaining({
          leftAt: expect.any(Date),
          totalDuration: expect.any(Number),
        })
      );
      expect(virtualEventRepository.decrement).toHaveBeenCalledWith(
        { id: 'test-event-id' },
        'currentAttendees',
        1
      );
    });

    it('should throw error if attendee not found', async () => {
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.leaveEvent('test-event-id', 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateVirtualTickets', () => {
    it('should generate virtual tickets successfully', async () => {
      const ticketData = {
        accessLevel: 'ticket_holders' as any,
        allowRecordingAccess: true,
      };

      const mockTickets = [
        { id: 'ticket-1', ticketNumber: 'VT-123-0001', accessToken: 'token-1' },
        { id: 'ticket-2', ticketNumber: 'VT-123-0002', accessToken: 'token-2' },
      ];

      jest.spyOn(service, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(virtualTicketRepository, 'create').mockImplementation((data) => data as any);
      jest.spyOn(virtualTicketRepository, 'save').mockResolvedValue(mockTickets as any);

      const result = await service.generateVirtualTickets('test-event-id', 2, ticketData);

      expect(virtualTicketRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockTickets);
    });
  });

  describe('validateVirtualTicket', () => {
    it('should validate ticket successfully', async () => {
      const mockTicket = {
        id: 'ticket-id',
        ticketNumber: 'VT-123-0001',
        accessToken: 'valid-token',
        validFrom: new Date(Date.now() - 1000),
        validUntil: new Date(Date.now() + 1000),
        currentSessions: 0,
        maxConcurrentSessions: 1,
      };

      jest.spyOn(virtualTicketRepository, 'findOne').mockResolvedValue(mockTicket as any);

      const result = await service.validateVirtualTicket('VT-123-0001', 'valid-token');

      expect(result).toEqual(mockTicket);
    });

    it('should throw error for invalid ticket', async () => {
      jest.spyOn(virtualTicketRepository, 'findOne').mockResolvedValue(null);

      await expect(service.validateVirtualTicket('invalid', 'invalid')).rejects.toThrow(NotFoundException);
    });

    it('should throw error for expired ticket', async () => {
      const expiredTicket = {
        id: 'ticket-id',
        ticketNumber: 'VT-123-0001',
        accessToken: 'valid-token',
        validFrom: new Date(Date.now() - 2000),
        validUntil: new Date(Date.now() - 1000),
        currentSessions: 0,
        maxConcurrentSessions: 1,
      };

      jest.spyOn(virtualTicketRepository, 'findOne').mockResolvedValue(expiredTicket as any);

      await expect(service.validateVirtualTicket('VT-123-0001', 'valid-token')).rejects.toThrow(BadRequestException);
    });
  });
});

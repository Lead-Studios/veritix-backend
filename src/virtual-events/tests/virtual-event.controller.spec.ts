import { Test, TestingModule } from '@nestjs/testing';
import { VirtualEventController } from '../controllers/virtual-event.controller';
import { VirtualEventService } from '../services/virtual-event.service';
import { CreateVirtualEventDto } from '../dto/create-virtual-event.dto';
import { UpdateVirtualEventDto } from '../dto/update-virtual-event.dto';
import { EventType, StreamingPlatform, AccessLevel } from '../enums/virtual-event.enum';

describe('VirtualEventController', () => {
  let controller: VirtualEventController;
  let service: VirtualEventService;

  const mockVirtualEvent = {
    id: 'test-event-id',
    eventType: EventType.VIRTUAL,
    streamingPlatform: StreamingPlatform.ZOOM,
    eventId: 'main-event-id',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVirtualEventService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    startEvent: jest.fn(),
    endEvent: jest.fn(),
    joinEvent: jest.fn(),
    leaveEvent: jest.fn(),
    getEventAttendees: jest.fn(),
    getCurrentAttendees: jest.fn(),
    updateAttendeeStatus: jest.fn(),
    generateVirtualTickets: jest.fn(),
    validateVirtualTicket: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VirtualEventController],
      providers: [
        {
          provide: VirtualEventService,
          useValue: mockVirtualEventService,
        },
      ],
    }).compile();

    controller = module.get<VirtualEventController>(VirtualEventController);
    service = module.get<VirtualEventService>(VirtualEventService);
  });

  describe('create', () => {
    it('should create a virtual event', async () => {
      const createDto: CreateVirtualEventDto = {
        eventType: EventType.VIRTUAL,
        streamingPlatform: StreamingPlatform.ZOOM,
        accessLevel: AccessLevel.TICKET_HOLDERS,
        eventId: 'main-event-id',
      };

      mockVirtualEventService.create.mockResolvedValue(mockVirtualEvent);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockVirtualEvent);
    });
  });

  describe('findAll', () => {
    it('should return all virtual events', async () => {
      const mockEvents = [mockVirtualEvent];
      mockVirtualEventService.findAll.mockResolvedValue(mockEvents);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockEvents);
    });

    it('should return virtual events filtered by eventId', async () => {
      const mockEvents = [mockVirtualEvent];
      mockVirtualEventService.findAll.mockResolvedValue(mockEvents);

      const result = await controller.findAll('main-event-id');

      expect(service.findAll).toHaveBeenCalledWith('main-event-id');
      expect(result).toEqual(mockEvents);
    });
  });

  describe('findOne', () => {
    it('should return a virtual event by id', async () => {
      mockVirtualEventService.findOne.mockResolvedValue(mockVirtualEvent);

      const result = await controller.findOne('test-event-id');

      expect(service.findOne).toHaveBeenCalledWith('test-event-id');
      expect(result).toEqual(mockVirtualEvent);
    });
  });

  describe('update', () => {
    it('should update a virtual event', async () => {
      const updateDto: UpdateVirtualEventDto = {
        allowChat: false,
      };
      const updatedEvent = { ...mockVirtualEvent, allowChat: false };

      mockVirtualEventService.update.mockResolvedValue(updatedEvent);

      const result = await controller.update('test-event-id', updateDto);

      expect(service.update).toHaveBeenCalledWith('test-event-id', updateDto);
      expect(result).toEqual(updatedEvent);
    });
  });

  describe('remove', () => {
    it('should remove a virtual event', async () => {
      mockVirtualEventService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('test-event-id');

      expect(service.remove).toHaveBeenCalledWith('test-event-id');
      expect(result).toBeUndefined();
    });
  });

  describe('startEvent', () => {
    it('should start a virtual event', async () => {
      const startedEvent = { ...mockVirtualEvent, status: 'live' };
      mockVirtualEventService.startEvent.mockResolvedValue(startedEvent);

      const result = await controller.startEvent('test-event-id');

      expect(service.startEvent).toHaveBeenCalledWith('test-event-id');
      expect(result).toEqual(startedEvent);
    });
  });

  describe('endEvent', () => {
    it('should end a virtual event', async () => {
      const endedEvent = { ...mockVirtualEvent, status: 'ended' };
      mockVirtualEventService.endEvent.mockResolvedValue(endedEvent);

      const result = await controller.endEvent('test-event-id');

      expect(service.endEvent).toHaveBeenCalledWith('test-event-id');
      expect(result).toEqual(endedEvent);
    });
  });

  describe('joinEvent', () => {
    it('should allow user to join event', async () => {
      const joinData = { userId: 'user-id' };
      const mockAttendee = { id: 'attendee-id', userId: 'user-id' };

      mockVirtualEventService.joinEvent.mockResolvedValue(mockAttendee);

      const result = await controller.joinEvent('test-event-id', joinData);

      expect(service.joinEvent).toHaveBeenCalledWith('test-event-id', 'user-id', undefined);
      expect(result).toEqual(mockAttendee);
    });

    it('should allow guest to join event', async () => {
      const joinData = {
        userId: 'user-id',
        guestInfo: { name: 'Guest User', email: 'guest@example.com' },
      };
      const mockAttendee = { id: 'attendee-id', userId: 'user-id' };

      mockVirtualEventService.joinEvent.mockResolvedValue(mockAttendee);

      const result = await controller.joinEvent('test-event-id', joinData);

      expect(service.joinEvent).toHaveBeenCalledWith('test-event-id', 'user-id', joinData.guestInfo);
      expect(result).toEqual(mockAttendee);
    });
  });

  describe('getAttendees', () => {
    it('should return all attendees', async () => {
      const mockAttendees = [{ id: 'attendee-1' }, { id: 'attendee-2' }];
      mockVirtualEventService.getEventAttendees.mockResolvedValue(mockAttendees);

      const result = await controller.getAttendees('test-event-id');

      expect(service.getEventAttendees).toHaveBeenCalledWith('test-event-id');
      expect(result).toEqual(mockAttendees);
    });

    it('should return current attendees when current=true', async () => {
      const mockCurrentAttendees = [{ id: 'attendee-1' }];
      mockVirtualEventService.getCurrentAttendees.mockResolvedValue(mockCurrentAttendees);

      const result = await controller.getAttendees('test-event-id', true);

      expect(service.getCurrentAttendees).toHaveBeenCalledWith('test-event-id');
      expect(result).toEqual(mockCurrentAttendees);
    });
  });

  describe('generateTickets', () => {
    it('should generate virtual tickets', async () => {
      const generateData = {
        count: 5,
        ticketData: {
          virtualEventId: 'test-event-id',
          accessLevel: AccessLevel.TICKET_HOLDERS,
        },
      };
      const mockTickets = Array(5).fill(null).map((_, i) => ({
        id: `ticket-${i}`,
        ticketNumber: `VT-${i}`,
      }));

      mockVirtualEventService.generateVirtualTickets.mockResolvedValue(mockTickets);

      const result = await controller.generateTickets('test-event-id', generateData);

      expect(service.generateVirtualTickets).toHaveBeenCalledWith(
        'test-event-id',
        5,
        generateData.ticketData
      );
      expect(result).toEqual(mockTickets);
    });
  });

  describe('validateTicket', () => {
    it('should validate virtual ticket', async () => {
      const validateData = {
        ticketNumber: 'VT-123',
        accessToken: 'token-123',
      };
      const mockTicket = {
        id: 'ticket-id',
        ticketNumber: 'VT-123',
        accessToken: 'token-123',
      };

      mockVirtualEventService.validateVirtualTicket.mockResolvedValue(mockTicket);

      const result = await controller.validateTicket(validateData);

      expect(service.validateVirtualTicket).toHaveBeenCalledWith('VT-123', 'token-123');
      expect(result).toEqual(mockTicket);
    });
  });
});

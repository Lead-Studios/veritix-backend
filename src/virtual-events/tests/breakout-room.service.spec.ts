import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BreakoutRoomService } from '../services/breakout-room.service';
import { BreakoutRoom } from '../entities/breakout-room.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { VirtualEventAttendee } from '../entities/virtual-event-attendee.entity';
import { BreakoutRoomStatus } from '../enums/virtual-event.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BreakoutRoomService', () => {
  let service: BreakoutRoomService;
  let breakoutRoomRepository: Repository<BreakoutRoom>;
  let virtualEventRepository: Repository<VirtualEvent>;
  let attendeeRepository: Repository<VirtualEventAttendee>;

  const mockVirtualEvent = {
    id: 'test-event-id',
    allowBreakoutRooms: true,
  };

  const mockBreakoutRoom = {
    id: 'room-id',
    name: 'Test Room',
    virtualEventId: 'test-event-id',
    status: BreakoutRoomStatus.AVAILABLE,
    maxParticipants: 10,
    currentParticipants: 0,
    participantsList: [],
    moderators: [],
  };

  const mockAttendee = {
    id: 'attendee-id',
    virtualEventId: 'test-event-id',
    userId: 'user-id',
    leftAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakoutRoomService,
        {
          provide: getRepositoryToken(BreakoutRoom),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualEvent),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualEventAttendee),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BreakoutRoomService>(BreakoutRoomService);
    breakoutRoomRepository = module.get<Repository<BreakoutRoom>>(getRepositoryToken(BreakoutRoom));
    virtualEventRepository = module.get<Repository<VirtualEvent>>(getRepositoryToken(VirtualEvent));
    attendeeRepository = module.get<Repository<VirtualEventAttendee>>(getRepositoryToken(VirtualEventAttendee));
  });

  describe('createBreakoutRoom', () => {
    it('should create breakout room successfully', async () => {
      const createDto = {
        name: 'Test Room',
        virtualEventId: 'test-event-id',
        maxParticipants: 10,
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(breakoutRoomRepository, 'create').mockReturnValue(mockBreakoutRoom as any);
      jest.spyOn(breakoutRoomRepository, 'save').mockResolvedValue(mockBreakoutRoom as any);

      const result = await service.createBreakoutRoom(createDto);

      expect(virtualEventRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-event-id' },
      });
      expect(result).toEqual(mockBreakoutRoom);
    });

    it('should throw error if virtual event not found', async () => {
      const createDto = {
        name: 'Test Room',
        virtualEventId: 'non-existent-id',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createBreakoutRoom(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if breakout rooms not allowed', async () => {
      const eventWithoutBreakout = { ...mockVirtualEvent, allowBreakoutRooms: false };
      const createDto = {
        name: 'Test Room',
        virtualEventId: 'test-event-id',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(eventWithoutBreakout as any);

      await expect(service.createBreakoutRoom(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('joinBreakoutRoom', () => {
    it('should allow user to join breakout room', async () => {
      const roomWithParticipants = {
        ...mockBreakoutRoom,
        participantsList: ['user-id'],
        currentParticipants: 1,
      };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(mockBreakoutRoom as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(mockAttendee as any);
      jest.spyOn(breakoutRoomRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(attendeeRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(roomWithParticipants as any);

      const result = await service.joinBreakoutRoom('room-id', 'user-id');

      expect(breakoutRoomRepository.update).toHaveBeenCalledWith('room-id', {
        participantsList: ['user-id'],
        currentParticipants: 1,
      });
      expect(attendeeRepository.update).toHaveBeenCalledWith(mockAttendee.id, {
        breakoutRoomId: 'room-id',
      });
    });

    it('should throw error if room not available', async () => {
      const unavailableRoom = { ...mockBreakoutRoom, status: BreakoutRoomStatus.MAINTENANCE };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(unavailableRoom as any);

      await expect(service.joinBreakoutRoom('room-id', 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if room is full', async () => {
      const fullRoom = {
        ...mockBreakoutRoom,
        currentParticipants: 10,
        maxParticipants: 10,
      };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(fullRoom as any);

      await expect(service.joinBreakoutRoom('room-id', 'user-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if user not in main event', async () => {
      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(mockBreakoutRoom as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(null);

      await expect(service.joinBreakoutRoom('room-id', 'user-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveBreakoutRoom', () => {
    it('should allow user to leave breakout room', async () => {
      const roomWithParticipants = {
        ...mockBreakoutRoom,
        participantsList: ['user-id', 'other-user'],
        currentParticipants: 2,
      };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(roomWithParticipants as any);
      jest.spyOn(breakoutRoomRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(attendeeRepository, 'findOne').mockResolvedValue(mockAttendee as any);
      jest.spyOn(attendeeRepository, 'update').mockResolvedValue(undefined as any);

      await service.leaveBreakoutRoom('room-id', 'user-id');

      expect(breakoutRoomRepository.update).toHaveBeenCalledWith('room-id', {
        participantsList: ['other-user'],
        currentParticipants: 1,
      });
      expect(attendeeRepository.update).toHaveBeenCalledWith(mockAttendee.id, {
        breakoutRoomId: null,
      });
    });
  });

  describe('startBreakoutRoom', () => {
    it('should start breakout room successfully', async () => {
      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(mockBreakoutRoom as any);
      jest.spyOn(breakoutRoomRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.startBreakoutRoom('room-id');

      expect(breakoutRoomRepository.update).toHaveBeenCalledWith('room-id', {
        status: BreakoutRoomStatus.OCCUPIED,
        actualStartTime: expect.any(Date),
      });
    });

    it('should throw error if room cannot be started', async () => {
      const occupiedRoom = { ...mockBreakoutRoom, status: BreakoutRoomStatus.OCCUPIED };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(occupiedRoom as any);

      await expect(service.startBreakoutRoom('room-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('endBreakoutRoom', () => {
    it('should end breakout room successfully', async () => {
      const activeRoom = {
        ...mockBreakoutRoom,
        status: BreakoutRoomStatus.OCCUPIED,
        actualStartTime: new Date(Date.now() - 60000), // 1 minute ago
      };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(activeRoom as any);
      jest.spyOn(breakoutRoomRepository, 'update').mockResolvedValue(undefined as any);
      jest.spyOn(attendeeRepository, 'update').mockResolvedValue(undefined as any);

      await service.endBreakoutRoom('room-id');

      expect(breakoutRoomRepository.update).toHaveBeenCalledWith('room-id', {
        status: BreakoutRoomStatus.AVAILABLE,
        actualEndTime: expect.any(Date),
        totalDuration: expect.any(Number),
        participantsList: [],
        currentParticipants: 0,
      });
    });

    it('should throw error if room is not active', async () => {
      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(mockBreakoutRoom as any);

      await expect(service.endBreakoutRoom('room-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('addModerator', () => {
    it('should add moderator successfully', async () => {
      const updatedRoom = { ...mockBreakoutRoom, moderators: ['user-id'] };

      jest.spyOn(service, 'getBreakoutRoom')
        .mockResolvedValueOnce(mockBreakoutRoom as any)
        .mockResolvedValueOnce(updatedRoom as any);
      jest.spyOn(breakoutRoomRepository, 'update').mockResolvedValue(undefined as any);

      const result = await service.addModerator('room-id', 'user-id');

      expect(breakoutRoomRepository.update).toHaveBeenCalledWith('room-id', {
        moderators: ['user-id'],
      });
      expect(result.moderators).toContain('user-id');
    });
  });

  describe('getBreakoutRoomAnalytics', () => {
    it('should return analytics data', async () => {
      const room = {
        ...mockBreakoutRoom,
        actualStartTime: new Date(),
        totalDuration: 3600,
        currentParticipants: 5,
      };

      jest.spyOn(service, 'getBreakoutRoom').mockResolvedValue(room as any);

      const result = await service.getBreakoutRoomAnalytics('room-id');

      expect(result).toEqual({
        roomId: 'room-id',
        name: 'Test Room',
        totalSessions: 1,
        totalDuration: 3600,
        maxParticipants: 10,
        peakParticipants: 5,
        currentParticipants: 5,
        status: BreakoutRoomStatus.AVAILABLE,
        createdAt: expect.any(Date),
        lastActivity: expect.any(Date),
      });
    });
  });
});

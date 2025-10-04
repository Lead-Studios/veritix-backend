import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventService } from './event.service';
import { Event } from './event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { User } from '../../user/user.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('EventService', () => {
  let service: EventService;
  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const organizer: User = {
    id: 'org-1',
    email: 'org@test.com',
    passwordHash: '',
    role: 'organizer',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: getRepositoryToken(Event), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<EventService>(EventService);
    jest.clearAllMocks();
  });

  it('should create event with valid data', async () => {
    const dto: CreateEventDto = {
      title: 't',
      location: 'l',
      startDate: '2025-10-01',
      endDate: '2025-10-02',
      capacity: 10,
    };
    mockRepo.create.mockReturnValue({ ...dto, organizer });
    mockRepo.save.mockResolvedValue({ ...dto, organizer, id: '1' });
    const result = await service.create(dto, organizer);
    expect(result.organizer).toBe(organizer);
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should throw if startDate >= endDate', async () => {
    const dto: CreateEventDto = {
      title: 't',
      location: 'l',
      startDate: '2025-10-02',
      endDate: '2025-10-01',
      capacity: 10,
    };
    await expect(service.create(dto, organizer)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw if capacity < 0', async () => {
    const dto: CreateEventDto = {
      title: 't',
      location: 'l',
      startDate: '2025-10-01',
      endDate: '2025-10-02',
      capacity: -1,
    };
    await expect(service.create(dto, organizer)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should find all events for organizer', async () => {
    mockRepo.find.mockResolvedValue([{ id: '1', organizer }]);
    const result = await service.findAll(organizer);
    expect(result[0].organizer).toBe(organizer);
  });

  it('should find one event for organizer', async () => {
    mockRepo.findOne.mockResolvedValue({ id: '1', organizer });
    const result = await service.findOne('1', organizer);
    expect(result.organizer).toBe(organizer);
  });

  it('should throw NotFound if event not found', async () => {
    mockRepo.findOne.mockResolvedValue(undefined);
    await expect(service.findOne('1', organizer)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update event with valid data', async () => {
    const event = {
      id: '1',
      organizer,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-02'),
      capacity: 10,
    };
    mockRepo.findOne.mockResolvedValue(event);
    mockRepo.save.mockResolvedValue({ ...event, title: 'new' });
    const result = await service.update('1', { title: 'new' }, organizer);
    expect(result.title).toBe('new');
  });

  it('should throw if update has invalid dates', async () => {
    const event = {
      id: '1',
      organizer,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-02'),
      capacity: 10,
    };
    mockRepo.findOne.mockResolvedValue(event);
    await expect(
      service.update(
        '1',
        { startDate: '2025-10-03', endDate: '2025-10-02' },
        organizer,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw if update has negative capacity', async () => {
    const event = {
      id: '1',
      organizer,
      startDate: new Date('2025-10-01'),
      endDate: new Date('2025-10-02'),
      capacity: 10,
    };
    mockRepo.findOne.mockResolvedValue(event);
    await expect(
      service.update('1', { capacity: -5 }, organizer),
    ).rejects.toThrow(ForbiddenException);
  });
});

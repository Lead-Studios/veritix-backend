import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from '../../user/user.entity';

describe('EventController', () => {
  let controller: EventController;
  let service: EventService;
  const organizer: User = { id: 'org-1', email: 'org@test.com', passwordHash: '', role: 'organizer', createdAt: new Date() };

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: mockService },
      ],
    }).compile();
    controller = module.get<EventController>(EventController);
    service = module.get<EventService>(EventService);
    jest.clearAllMocks();
  });

  it('should create event', async () => {
    const dto: CreateEventDto = { title: 't', location: 'l', startDate: '2025-10-01', endDate: '2025-10-02', capacity: 10 } as any;
    mockService.create.mockResolvedValue({ ...dto, organizer });
    const req = { user: organizer };
    const result = await controller.create(dto, req);
    expect(result.organizer).toBe(organizer);
  });

  it('should list events', async () => {
    mockService.findAll.mockResolvedValue([{ id: '1', organizer }]);
    const req = { user: organizer };
    const result = await controller.findAll(req);
    expect(result[0].organizer).toBe(organizer);
  });

  it('should get event by id', async () => {
    mockService.findOne.mockResolvedValue({ id: '1', organizer });
    const req = { user: organizer };
    const result = await controller.findOne('1', req);
    expect(result.organizer).toBe(organizer);
  });

  it('should update event', async () => {
    mockService.update.mockResolvedValue({ id: '1', organizer, title: 'new' });
    const req = { user: organizer };
    const result = await controller.update('1', { title: 'new' } as UpdateEventDto, req);
    expect(result.title).toBe('new');
  });
});

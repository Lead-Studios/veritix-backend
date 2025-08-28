import { Test, TestingModule } from '@nestjs/testing';
import { PollController } from '../poll.controller';
import { PollService } from '../../services/poll.service';
import { PollStatus, PollType } from '../../entities/poll.entity';

describe('PollController', () => {
  let controller: PollController;
  let service: PollService;

  const mockPollService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByStatus: jest.fn(),
    findActive: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    vote: jest.fn(),
    getUserVote: jest.fn(),
    getPollResults: jest.fn(),
    moderate: jest.fn(),
  };

  const mockRequest = {
    user: {
      id: 'user-1',
      ownerId: 'owner-1',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PollController],
      providers: [
        {
          provide: PollService,
          useValue: mockPollService,
        },
      ],
    }).compile();

    controller = module.get<PollController>(PollController);
    service = module.get<PollService>(PollService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a poll', async () => {
      const createPollDto = {
        title: 'Test Poll',
        type: PollType.SINGLE_CHOICE,
        eventId: 'event-1',
        options: [{ text: 'Option 1' }, { text: 'Option 2' }],
      };
      const expectedResult = { id: '1', ...createPollDto };

      mockPollService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createPollDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createPollDto, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByEvent', () => {
    it('should return all polls for an event', async () => {
      const eventId = 'event-1';
      const expectedResult = [{ id: '1', title: 'Poll 1' }];

      mockPollService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findByEvent(eventId, undefined, undefined, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(eventId, 'owner-1');
      expect(result).toEqual(expectedResult);
    });

    it('should return active polls', async () => {
      const eventId = 'event-1';
      const expectedResult = [{ id: '1', title: 'Active Poll' }];

      mockPollService.findActive.mockResolvedValue(expectedResult);

      const result = await controller.findByEvent(eventId, undefined, true, mockRequest);

      expect(service.findActive).toHaveBeenCalledWith(eventId, 'owner-1');
      expect(result).toEqual(expectedResult);
    });

    it('should return polls by status', async () => {
      const eventId = 'event-1';
      const status = PollStatus.APPROVED;
      const expectedResult = [{ id: '1', title: 'Approved Poll' }];

      mockPollService.findByStatus.mockResolvedValue(expectedResult);

      const result = await controller.findByEvent(eventId, status, undefined, mockRequest);

      expect(service.findByStatus).toHaveBeenCalledWith(eventId, status, 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('vote', () => {
    it('should vote in a poll', async () => {
      const voteDto = { pollId: '1', optionIds: ['option-1'] };
      const expectedResult = { id: '1', totalVotes: 1 };

      mockPollService.vote.mockResolvedValue(expectedResult);

      const result = await controller.vote(voteDto, mockRequest);

      expect(service.vote).toHaveBeenCalledWith(voteDto, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getResults', () => {
    it('should get poll results', async () => {
      const pollId = '1';
      const expectedResult = {
        poll: { id: '1', title: 'Test Poll', totalVotes: 10 },
        options: [{ id: 'option-1', text: 'Option 1', voteCount: 7, percentage: 70 }],
      };

      mockPollService.getPollResults.mockResolvedValue(expectedResult);

      const result = await controller.getResults(pollId, mockRequest);

      expect(service.getPollResults).toHaveBeenCalledWith(pollId, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('moderate', () => {
    it('should moderate a poll', async () => {
      const pollId = '1';
      const body = { status: PollStatus.APPROVED, moderationNote: 'Approved' };
      const expectedResult = { id: '1', status: PollStatus.APPROVED };

      mockPollService.moderate.mockResolvedValue(expectedResult);

      const result = await controller.moderate(pollId, body, mockRequest);

      expect(service.moderate).toHaveBeenCalledWith(pollId, body.status, body.moderationNote, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });
});

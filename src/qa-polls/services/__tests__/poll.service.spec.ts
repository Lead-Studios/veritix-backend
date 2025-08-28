import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PollService } from '../poll.service';
import { Poll, PollStatus, PollType } from '../../entities/poll.entity';
import { PollOption } from '../../entities/poll-option.entity';
import { PollVote } from '../../entities/poll-vote.entity';

describe('PollService', () => {
  let service: PollService;
  let pollRepository: Repository<Poll>;
  let pollOptionRepository: Repository<PollOption>;
  let pollVoteRepository: Repository<PollVote>;

  const mockPoll = {
    id: '1',
    title: 'Test Poll',
    type: PollType.SINGLE_CHOICE,
    status: PollStatus.ACTIVE,
    eventId: 'event-1',
    createdById: 'user-1',
    totalVotes: 0,
    allowMultipleVotes: false,
    showResults: true,
    ownerId: 'owner-1',
    options: [],
    votes: [],
  };

  const mockPollOption = {
    id: 'option-1',
    text: 'Option 1',
    pollId: '1',
    voteCount: 0,
    order: 0,
    ownerId: 'owner-1',
  };

  const mockPollRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    increment: jest.fn(),
  };

  const mockPollOptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    increment: jest.fn(),
  };

  const mockPollVoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PollService,
        {
          provide: getRepositoryToken(Poll),
          useValue: mockPollRepository,
        },
        {
          provide: getRepositoryToken(PollOption),
          useValue: mockPollOptionRepository,
        },
        {
          provide: getRepositoryToken(PollVote),
          useValue: mockPollVoteRepository,
        },
      ],
    }).compile();

    service = module.get<PollService>(PollService);
    pollRepository = module.get<Repository<Poll>>(getRepositoryToken(Poll));
    pollOptionRepository = module.get<Repository<PollOption>>(getRepositoryToken(PollOption));
    pollVoteRepository = module.get<Repository<PollVote>>(getRepositoryToken(PollVote));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a poll with options', async () => {
      const createPollDto = {
        title: 'Test Poll',
        type: PollType.SINGLE_CHOICE,
        eventId: 'event-1',
        options: [
          { text: 'Option 1', order: 0 },
          { text: 'Option 2', order: 1 },
        ],
      };

      const savedPoll = { ...mockPoll, id: '1' };
      const savedOptions = [
        { ...mockPollOption, id: 'option-1', text: 'Option 1' },
        { ...mockPollOption, id: 'option-2', text: 'Option 2' },
      ];

      mockPollRepository.create.mockReturnValue(savedPoll);
      mockPollRepository.save.mockResolvedValue(savedPoll);
      mockPollOptionRepository.create.mockImplementation((option) => option);
      mockPollOptionRepository.save.mockResolvedValue(savedOptions);
      mockPollRepository.findOne.mockResolvedValue({ ...savedPoll, options: savedOptions });

      const result = await service.create(createPollDto, 'user-1', 'owner-1');

      expect(mockPollRepository.create).toHaveBeenCalledWith({
        title: 'Test Poll',
        type: PollType.SINGLE_CHOICE,
        eventId: 'event-1',
        createdById: 'user-1',
        ownerId: 'owner-1',
        startsAt: null,
        endsAt: null,
      });
      expect(mockPollOptionRepository.save).toHaveBeenCalled();
      expect(result.options).toBeDefined();
    });
  });

  describe('findActive', () => {
    it('should return active polls within time constraints', async () => {
      const now = new Date();
      const activePoll = {
        ...mockPoll,
        status: PollStatus.ACTIVE,
        startsAt: new Date(now.getTime() - 3600000), // 1 hour ago
        endsAt: new Date(now.getTime() + 3600000), // 1 hour from now
      };

      mockPollRepository.find.mockResolvedValue([activePoll]);

      const result = await service.findActive('event-1', 'owner-1');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(PollStatus.ACTIVE);
    });

    it('should filter out polls that have not started', async () => {
      const now = new Date();
      const futurePoll = {
        ...mockPoll,
        status: PollStatus.ACTIVE,
        startsAt: new Date(now.getTime() + 3600000), // 1 hour from now
      };

      mockPollRepository.find.mockResolvedValue([futurePoll]);

      const result = await service.findActive('event-1', 'owner-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('vote', () => {
    it('should allow voting in single choice poll', async () => {
      const voteDto = {
        pollId: '1',
        optionIds: ['option-1'],
      };

      const activePoll = {
        ...mockPoll,
        status: PollStatus.ACTIVE,
        options: [mockPollOption],
      };

      mockPollRepository.findOne.mockResolvedValue(activePoll);
      mockPollVoteRepository.findOne.mockResolvedValue(null);
      mockPollOptionRepository.find.mockResolvedValue([mockPollOption]);
      mockPollVoteRepository.create.mockReturnValue({ id: 'vote-1', ...voteDto, userId: 'user-1' });
      mockPollVoteRepository.save.mockResolvedValue({ id: 'vote-1', ...voteDto, userId: 'user-1' });
      mockPollRepository.save.mockResolvedValue({ ...activePoll, totalVotes: 1 });
      mockPollRepository.findOne.mockResolvedValueOnce({ ...activePoll, totalVotes: 1 });

      const result = await service.vote(voteDto, 'user-1', 'owner-1');

      expect(mockPollVoteRepository.save).toHaveBeenCalled();
      expect(mockPollOptionRepository.increment).toHaveBeenCalledWith({ id: 'option-1' }, 'voteCount', 1);
    });

    it('should reject voting if poll is not active', async () => {
      const voteDto = {
        pollId: '1',
        optionIds: ['option-1'],
      };

      const inactivePoll = { ...mockPoll, status: PollStatus.PENDING };
      mockPollRepository.findOne.mockResolvedValue(inactivePoll);

      await expect(service.vote(voteDto, 'user-1', 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject multiple votes if not allowed', async () => {
      const voteDto = {
        pollId: '1',
        optionIds: ['option-1'],
      };

      const activePoll = { ...mockPoll, status: PollStatus.ACTIVE, allowMultipleVotes: false };
      const existingVote = { id: 'vote-1', pollId: '1', userId: 'user-1' };

      mockPollRepository.findOne.mockResolvedValue(activePoll);
      mockPollVoteRepository.findOne.mockResolvedValue(existingVote);

      await expect(service.vote(voteDto, 'user-1', 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('should validate single choice constraint', async () => {
      const voteDto = {
        pollId: '1',
        optionIds: ['option-1', 'option-2'],
      };

      const activePoll = { ...mockPoll, status: PollStatus.ACTIVE, type: PollType.SINGLE_CHOICE };
      mockPollRepository.findOne.mockResolvedValue(activePoll);
      mockPollVoteRepository.findOne.mockResolvedValue(null);

      await expect(service.vote(voteDto, 'user-1', 'owner-1')).rejects.toThrow(BadRequestException);
    });

    it('should handle text poll voting', async () => {
      const voteDto = {
        pollId: '1',
        textResponse: 'My text response',
      };

      const textPoll = { ...mockPoll, status: PollStatus.ACTIVE, type: PollType.TEXT };
      mockPollRepository.findOne.mockResolvedValue(textPoll);
      mockPollVoteRepository.findOne.mockResolvedValue(null);
      mockPollVoteRepository.create.mockReturnValue({ id: 'vote-1', ...voteDto, userId: 'user-1' });
      mockPollVoteRepository.save.mockResolvedValue({ id: 'vote-1', ...voteDto, userId: 'user-1' });
      mockPollRepository.save.mockResolvedValue({ ...textPoll, totalVotes: 1 });
      mockPollRepository.findOne.mockResolvedValueOnce({ ...textPoll, totalVotes: 1 });

      const result = await service.vote(voteDto, 'user-1', 'owner-1');

      expect(mockPollVoteRepository.save).toHaveBeenCalled();
    });

    it('should handle rating poll voting', async () => {
      const voteDto = {
        pollId: '1',
        ratingValue: 8,
      };

      const ratingPoll = { ...mockPoll, status: PollStatus.ACTIVE, type: PollType.RATING };
      mockPollRepository.findOne.mockResolvedValue(ratingPoll);
      mockPollVoteRepository.findOne.mockResolvedValue(null);
      mockPollVoteRepository.create.mockReturnValue({ id: 'vote-1', ...voteDto, userId: 'user-1' });
      mockPollVoteRepository.save.mockResolvedValue({ id: 'vote-1', ...voteDto, userId: 'user-1' });
      mockPollRepository.save.mockResolvedValue({ ...ratingPoll, totalVotes: 1 });
      mockPollRepository.findOne.mockResolvedValueOnce({ ...ratingPoll, totalVotes: 1 });

      const result = await service.vote(voteDto, 'user-1', 'owner-1');

      expect(mockPollVoteRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid rating values', async () => {
      const voteDto = {
        pollId: '1',
        ratingValue: 15, // Invalid rating
      };

      const ratingPoll = { ...mockPoll, status: PollStatus.ACTIVE, type: PollType.RATING };
      mockPollRepository.findOne.mockResolvedValue(ratingPoll);
      mockPollVoteRepository.findOne.mockResolvedValue(null);

      await expect(service.vote(voteDto, 'user-1', 'owner-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPollResults', () => {
    it('should return poll results when allowed', async () => {
      const pollWithResults = {
        ...mockPoll,
        showResults: true,
        totalVotes: 10,
        options: [
          { ...mockPollOption, id: 'option-1', text: 'Option 1', voteCount: 7 },
          { ...mockPollOption, id: 'option-2', text: 'Option 2', voteCount: 3 },
        ],
      };

      mockPollRepository.findOne.mockResolvedValue(pollWithResults);
      mockPollVoteRepository.find.mockResolvedValue([{ id: 'vote-1' }]); // User has voted

      const result = await service.getPollResults('1', 'user-1', 'owner-1');

      expect(result.poll.totalVotes).toBe(10);
      expect(result.options).toHaveLength(2);
      expect(result.options[0].percentage).toBe(70);
      expect(result.options[1].percentage).toBe(30);
    });

    it('should reject results access when not allowed', async () => {
      const pollWithoutResults = { ...mockPoll, showResults: false };
      mockPollRepository.findOne.mockResolvedValue(pollWithoutResults);

      await expect(service.getPollResults('1', 'user-1', 'owner-1')).rejects.toThrow(ForbiddenException);
    });

    it('should require voting before showing results when configured', async () => {
      const pollWithRestrictedResults = {
        ...mockPoll,
        showResults: true,
        showResultsAfterVoting: true,
      };

      mockPollRepository.findOne.mockResolvedValue(pollWithRestrictedResults);
      mockPollVoteRepository.find.mockResolvedValue([]); // User has not voted

      await expect(service.getPollResults('1', 'user-1', 'owner-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should allow poll creator to update', async () => {
      const updateDto = { title: 'Updated Poll Title' };
      const updatedPoll = { ...mockPoll, ...updateDto };

      mockPollRepository.findOne.mockResolvedValue(mockPoll);
      mockPollRepository.save.mockResolvedValue(updatedPoll);

      const result = await service.update('1', updateDto, 'user-1', 'owner-1');

      expect(result.title).toBe('Updated Poll Title');
    });

    it('should reject updates from non-creators', async () => {
      const updateDto = { title: 'Unauthorized Update' };
      mockPollRepository.findOne.mockResolvedValue(mockPoll);

      await expect(service.update('1', updateDto, 'user-2', 'owner-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow moderator actions', async () => {
      const updateDto = { status: PollStatus.APPROVED, moderationNote: 'Approved by moderator' };
      const moderatedPoll = { ...mockPoll, ...updateDto, moderatedBy: 'moderator-1' };

      mockPollRepository.findOne.mockResolvedValue(mockPoll);
      mockPollRepository.save.mockResolvedValue(moderatedPoll);

      const result = await service.update('1', updateDto, 'moderator-1', 'owner-1');

      expect(result.status).toBe(PollStatus.APPROVED);
      expect(result.moderatedBy).toBe('moderator-1');
    });
  });

  describe('moderate', () => {
    it('should moderate a poll', async () => {
      const moderatedPoll = {
        ...mockPoll,
        status: PollStatus.APPROVED,
        moderationNote: 'Approved by moderator',
        moderatedBy: 'moderator-1',
      };

      mockPollRepository.findOne.mockResolvedValue(mockPoll);
      mockPollRepository.save.mockResolvedValue(moderatedPoll);

      const result = await service.moderate('1', PollStatus.APPROVED, 'Approved by moderator', 'moderator-1', 'owner-1');

      expect(result.status).toBe(PollStatus.APPROVED);
      expect(result.moderationNote).toBe('Approved by moderator');
      expect(result.moderatedBy).toBe('moderator-1');
    });
  });
});

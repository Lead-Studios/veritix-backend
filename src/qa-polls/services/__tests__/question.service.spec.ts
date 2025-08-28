import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { QuestionService } from '../question.service';
import { Question, QuestionStatus, QuestionPriority } from '../../entities/question.entity';
import { QuestionVote, VoteType } from '../../entities/question-vote.entity';

describe('QuestionService', () => {
  let service: QuestionService;
  let questionRepository: Repository<Question>;
  let questionVoteRepository: Repository<QuestionVote>;

  const mockQuestion = {
    id: '1',
    content: 'Test question',
    status: QuestionStatus.PENDING,
    priority: QuestionPriority.MEDIUM,
    eventId: 'event-1',
    submittedById: 'user-1',
    upvotes: 0,
    downvotes: 0,
    isAnonymous: false,
    ownerId: 'owner-1',
  };

  const mockQuestionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };

  const mockQuestionVoteRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionService,
        {
          provide: getRepositoryToken(Question),
          useValue: mockQuestionRepository,
        },
        {
          provide: getRepositoryToken(QuestionVote),
          useValue: mockQuestionVoteRepository,
        },
      ],
    }).compile();

    service = module.get<QuestionService>(QuestionService);
    questionRepository = module.get<Repository<Question>>(getRepositoryToken(Question));
    questionVoteRepository = module.get<Repository<QuestionVote>>(getRepositoryToken(QuestionVote));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a question successfully', async () => {
      const createQuestionDto = {
        content: 'Test question',
        eventId: 'event-1',
        isAnonymous: false,
      };

      mockQuestionRepository.create.mockReturnValue(mockQuestion);
      mockQuestionRepository.save.mockResolvedValue(mockQuestion);

      const result = await service.create(createQuestionDto, 'user-1', 'owner-1');

      expect(mockQuestionRepository.create).toHaveBeenCalledWith({
        ...createQuestionDto,
        submittedById: 'user-1',
        ownerId: 'owner-1',
      });
      expect(mockQuestionRepository.save).toHaveBeenCalledWith(mockQuestion);
      expect(result).toEqual(mockQuestion);
    });

    it('should create anonymous question', async () => {
      const createQuestionDto = {
        content: 'Anonymous question',
        eventId: 'event-1',
        isAnonymous: true,
      };

      const anonymousQuestion = { ...mockQuestion, submittedById: null, isAnonymous: true };
      mockQuestionRepository.create.mockReturnValue(anonymousQuestion);
      mockQuestionRepository.save.mockResolvedValue(anonymousQuestion);

      const result = await service.create(createQuestionDto, 'user-1', 'owner-1');

      expect(mockQuestionRepository.create).toHaveBeenCalledWith({
        ...createQuestionDto,
        submittedById: null,
        ownerId: 'owner-1',
      });
      expect(result.submittedById).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all questions for an event', async () => {
      const questions = [mockQuestion];
      mockQuestionRepository.find.mockResolvedValue(questions);

      const result = await service.findAll('event-1', 'owner-1');

      expect(mockQuestionRepository.find).toHaveBeenCalledWith({
        where: { eventId: 'event-1', ownerId: 'owner-1' },
        relations: ['submittedBy', 'votes'],
        order: {
          isPinned: 'DESC',
          upvotes: 'DESC',
          createdAt: 'DESC',
        },
      });
      expect(result).toEqual(questions);
    });
  });

  describe('findOne', () => {
    it('should return a question by id', async () => {
      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);

      const result = await service.findOne('1', 'owner-1');

      expect(mockQuestionRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1', ownerId: 'owner-1' },
        relations: ['submittedBy', 'votes', 'votes.user'],
      });
      expect(result).toEqual(mockQuestion);
    });

    it('should throw NotFoundException when question not found', async () => {
      mockQuestionRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1', 'owner-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a question by owner', async () => {
      const updateDto = { content: 'Updated question' };
      const updatedQuestion = { ...mockQuestion, ...updateDto };

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuestionRepository.save.mockResolvedValue(updatedQuestion);

      const result = await service.update('1', updateDto, 'user-1', 'owner-1');

      expect(result).toEqual(updatedQuestion);
    });

    it('should throw ForbiddenException when user tries to update others question', async () => {
      const updateDto = { content: 'Updated question' };
      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);

      await expect(service.update('1', updateDto, 'user-2', 'owner-1')).rejects.toThrow(ForbiddenException);
    });

    it('should allow moderator actions', async () => {
      const updateDto = { status: QuestionStatus.APPROVED, moderationNote: 'Approved' };
      const updatedQuestion = { ...mockQuestion, ...updateDto, moderatedBy: 'moderator-1' };

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuestionRepository.save.mockResolvedValue(updatedQuestion);

      const result = await service.update('1', updateDto, 'moderator-1', 'owner-1');

      expect(result.moderatedBy).toBe('moderator-1');
      expect(result.status).toBe(QuestionStatus.APPROVED);
    });
  });

  describe('vote', () => {
    it('should create a new upvote', async () => {
      const voteDto = { questionId: '1', type: VoteType.UPVOTE };
      const updatedQuestion = { ...mockQuestion, upvotes: 1 };

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuestionVoteRepository.findOne.mockResolvedValue(null);
      mockQuestionVoteRepository.create.mockReturnValue({ ...voteDto, userId: 'user-1' });
      mockQuestionVoteRepository.save.mockResolvedValue({ ...voteDto, userId: 'user-1' });
      mockQuestionRepository.save.mockResolvedValue(updatedQuestion);

      const result = await service.vote(voteDto, 'user-1', 'owner-1');

      expect(result.upvotes).toBe(1);
      expect(mockQuestionVoteRepository.save).toHaveBeenCalled();
    });

    it('should update existing vote', async () => {
      const voteDto = { questionId: '1', type: VoteType.UPVOTE };
      const existingVote = { id: 'vote-1', type: VoteType.DOWNVOTE, questionId: '1', userId: 'user-1' };
      const questionWithDownvote = { ...mockQuestion, downvotes: 1 };
      const updatedQuestion = { ...mockQuestion, upvotes: 1, downvotes: 0 };

      mockQuestionRepository.findOne.mockResolvedValue(questionWithDownvote);
      mockQuestionVoteRepository.findOne.mockResolvedValue(existingVote);
      mockQuestionVoteRepository.save.mockResolvedValue({ ...existingVote, type: VoteType.UPVOTE });
      mockQuestionRepository.save.mockResolvedValue(updatedQuestion);

      const result = await service.vote(voteDto, 'user-1', 'owner-1');

      expect(result.upvotes).toBe(1);
      expect(result.downvotes).toBe(0);
    });
  });

  describe('removeVote', () => {
    it('should remove a vote', async () => {
      const vote = { id: 'vote-1', type: VoteType.UPVOTE, questionId: '1', userId: 'user-1' };
      const questionWithVote = { ...mockQuestion, upvotes: 1 };
      const updatedQuestion = { ...mockQuestion, upvotes: 0 };

      mockQuestionRepository.findOne.mockResolvedValue(questionWithVote);
      mockQuestionVoteRepository.findOne.mockResolvedValue(vote);
      mockQuestionVoteRepository.remove.mockResolvedValue(vote);
      mockQuestionRepository.save.mockResolvedValue(updatedQuestion);

      const result = await service.removeVote('1', 'user-1', 'owner-1');

      expect(result.upvotes).toBe(0);
      expect(mockQuestionVoteRepository.remove).toHaveBeenCalledWith(vote);
    });

    it('should throw NotFoundException when vote not found', async () => {
      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuestionVoteRepository.findOne.mockResolvedValue(null);

      await expect(service.removeVote('1', 'user-1', 'owner-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('moderate', () => {
    it('should moderate a question', async () => {
      const moderatedQuestion = {
        ...mockQuestion,
        status: QuestionStatus.APPROVED,
        moderationNote: 'Approved by moderator',
        moderatedBy: 'moderator-1',
      };

      mockQuestionRepository.findOne.mockResolvedValue(mockQuestion);
      mockQuestionRepository.save.mockResolvedValue(moderatedQuestion);

      const result = await service.moderate('1', QuestionStatus.APPROVED, 'Approved by moderator', 'moderator-1', 'owner-1');

      expect(result.status).toBe(QuestionStatus.APPROVED);
      expect(result.moderationNote).toBe('Approved by moderator');
      expect(result.moderatedBy).toBe('moderator-1');
    });
  });
});

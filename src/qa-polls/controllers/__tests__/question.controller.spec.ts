import { Test, TestingModule } from '@nestjs/testing';
import { QuestionController } from '../question.controller';
import { QuestionService } from '../../services/question.service';
import { QuestionStatus } from '../../entities/question.entity';

describe('QuestionController', () => {
  let controller: QuestionController;
  let service: QuestionService;

  const mockQuestionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findByStatus: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    vote: jest.fn(),
    removeVote: jest.fn(),
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
      controllers: [QuestionController],
      providers: [
        {
          provide: QuestionService,
          useValue: mockQuestionService,
        },
      ],
    }).compile();

    controller = module.get<QuestionController>(QuestionController);
    service = module.get<QuestionService>(QuestionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a question', async () => {
      const createQuestionDto = {
        content: 'Test question',
        eventId: 'event-1',
      };
      const expectedResult = { id: '1', ...createQuestionDto };

      mockQuestionService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createQuestionDto, mockRequest);

      expect(service.create).toHaveBeenCalledWith(createQuestionDto, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByEvent', () => {
    it('should return all questions for an event', async () => {
      const eventId = 'event-1';
      const expectedResult = [{ id: '1', content: 'Question 1' }];

      mockQuestionService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findByEvent(eventId, undefined, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(eventId, 'owner-1');
      expect(result).toEqual(expectedResult);
    });

    it('should return questions by status', async () => {
      const eventId = 'event-1';
      const status = QuestionStatus.APPROVED;
      const expectedResult = [{ id: '1', content: 'Approved question' }];

      mockQuestionService.findByStatus.mockResolvedValue(expectedResult);

      const result = await controller.findByEvent(eventId, status, mockRequest);

      expect(service.findByStatus).toHaveBeenCalledWith(eventId, status, 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('vote', () => {
    it('should vote on a question', async () => {
      const voteDto = { questionId: '1', type: 'upvote' as any };
      const expectedResult = { id: '1', upvotes: 1 };

      mockQuestionService.vote.mockResolvedValue(expectedResult);

      const result = await controller.vote(voteDto, mockRequest);

      expect(service.vote).toHaveBeenCalledWith(voteDto, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('moderate', () => {
    it('should moderate a question', async () => {
      const questionId = '1';
      const body = { status: QuestionStatus.APPROVED, moderationNote: 'Approved' };
      const expectedResult = { id: '1', status: QuestionStatus.APPROVED };

      mockQuestionService.moderate.mockResolvedValue(expectedResult);

      const result = await controller.moderate(questionId, body, mockRequest);

      expect(service.moderate).toHaveBeenCalledWith(questionId, body.status, body.moderationNote, 'user-1', 'owner-1');
      expect(result).toEqual(expectedResult);
    });
  });
});

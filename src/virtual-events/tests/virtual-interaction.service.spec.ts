import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VirtualInteractionService } from '../services/virtual-interaction.service';
import { VirtualEventInteraction } from '../entities/virtual-event-interaction.entity';
import { VirtualEvent } from '../entities/virtual-event.entity';
import { InteractionType } from '../enums/virtual-event.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('VirtualInteractionService', () => {
  let service: VirtualInteractionService;
  let interactionRepository: Repository<VirtualEventInteraction>;
  let virtualEventRepository: Repository<VirtualEvent>;

  const mockVirtualEvent = {
    id: 'test-event-id',
    allowChat: true,
    allowPolls: true,
    allowQA: true,
    allowBreakoutRooms: true,
  };

  const mockInteraction = {
    id: 'interaction-id',
    type: InteractionType.CHAT,
    virtualEventId: 'test-event-id',
    userId: 'user-id',
    content: 'Hello everyone!',
    isModerated: false,
    isApproved: false,
    likesCount: 0,
    repliesCount: 0,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VirtualInteractionService,
        {
          provide: getRepositoryToken(VirtualEventInteraction),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
            softDelete: jest.fn(),
            increment: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(VirtualEvent),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<VirtualInteractionService>(VirtualInteractionService);
    interactionRepository = module.get<Repository<VirtualEventInteraction>>(getRepositoryToken(VirtualEventInteraction));
    virtualEventRepository = module.get<Repository<VirtualEvent>>(getRepositoryToken(VirtualEvent));
  });

  describe('createInteraction', () => {
    it('should create chat interaction successfully', async () => {
      const createDto = {
        type: InteractionType.CHAT,
        virtualEventId: 'test-event-id',
        userId: 'user-id',
        content: 'Hello everyone!',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(mockVirtualEvent as any);
      jest.spyOn(interactionRepository, 'create').mockReturnValue(mockInteraction as any);
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(mockInteraction as any);

      const result = await service.createInteraction(createDto);

      expect(virtualEventRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'test-event-id' },
      });
      expect(interactionRepository.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockInteraction);
    });

    it('should throw error if virtual event not found', async () => {
      const createDto = {
        type: InteractionType.CHAT,
        virtualEventId: 'non-existent-id',
        userId: 'user-id',
        content: 'Hello!',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createInteraction(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw error if interaction type not allowed', async () => {
      const eventWithoutChat = { ...mockVirtualEvent, allowChat: false };
      const createDto = {
        type: InteractionType.CHAT,
        virtualEventId: 'test-event-id',
        userId: 'user-id',
        content: 'Hello!',
      };

      jest.spyOn(virtualEventRepository, 'findOne').mockResolvedValue(eventWithoutChat as any);

      await expect(service.createInteraction(createDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInteractions', () => {
    it('should return interactions with query builder', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockInteraction]),
      };

      jest.spyOn(interactionRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);

      const result = await service.getInteractions('test-event-id', InteractionType.CHAT, 50, 0);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith('interaction.virtualEventId = :virtualEventId', {
        virtualEventId: 'test-event-id',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('interaction.type = :type', {
        type: InteractionType.CHAT,
      });
      expect(result).toEqual([mockInteraction]);
    });
  });

  describe('moderateInteraction', () => {
    it('should moderate interaction successfully', async () => {
      const moderatedInteraction = {
        ...mockInteraction,
        isModerated: true,
        isApproved: true,
        moderatedBy: 'moderator-id',
        moderationNote: 'Approved',
      };

      jest.spyOn(interactionRepository, 'findOne').mockResolvedValue(mockInteraction as any);
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(moderatedInteraction as any);

      const result = await service.moderateInteraction('interaction-id', 'moderator-id', true, 'Approved');

      expect(interactionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isModerated: true,
          isApproved: true,
          moderatedBy: 'moderator-id',
          moderationNote: 'Approved',
        })
      );
      expect(result).toEqual(moderatedInteraction);
    });

    it('should throw error if interaction not found', async () => {
      jest.spyOn(interactionRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.moderateInteraction('non-existent-id', 'moderator-id', true)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('likeInteraction', () => {
    it('should increment like count', async () => {
      const likedInteraction = { ...mockInteraction, likesCount: 1 };

      jest.spyOn(interactionRepository, 'findOne').mockResolvedValue(mockInteraction as any);
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(likedInteraction as any);

      const result = await service.likeInteraction('interaction-id', 'user-id');

      expect(result.likesCount).toBe(1);
    });
  });

  describe('replyToInteraction', () => {
    it('should create reply and increment replies count', async () => {
      const replyDto = {
        type: InteractionType.CHAT,
        virtualEventId: 'test-event-id',
        userId: 'user-id',
        content: 'This is a reply',
      };

      const reply = { ...mockInteraction, id: 'reply-id', parentId: 'interaction-id' };

      jest.spyOn(interactionRepository, 'findOne').mockResolvedValue(mockInteraction as any);
      jest.spyOn(interactionRepository, 'create').mockReturnValue(reply as any);
      jest.spyOn(interactionRepository, 'save').mockResolvedValue(reply as any);
      jest.spyOn(interactionRepository, 'increment').mockResolvedValue(undefined as any);

      const result = await service.replyToInteraction('interaction-id', replyDto);

      expect(interactionRepository.increment).toHaveBeenCalledWith(
        { id: 'interaction-id' },
        'repliesCount',
        1
      );
      expect(result.parentId).toBe('interaction-id');
    });
  });

  describe('deleteInteraction', () => {
    it('should delete interaction if user owns it', async () => {
      jest.spyOn(interactionRepository, 'findOne').mockResolvedValue(mockInteraction as any);
      jest.spyOn(interactionRepository, 'softDelete').mockResolvedValue(undefined as any);

      await service.deleteInteraction('interaction-id', 'user-id');

      expect(interactionRepository.softDelete).toHaveBeenCalledWith('interaction-id');
    });

    it('should throw error if user does not own interaction', async () => {
      jest.spyOn(interactionRepository, 'findOne').mockResolvedValue(mockInteraction as any);

      await expect(
        service.deleteInteraction('interaction-id', 'different-user-id')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInteractionAnalytics', () => {
    it('should return analytics data', async () => {
      const mockAnalytics = [
        { type: 'chat', count: '10' },
        { type: 'qa', count: '5' },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(mockAnalytics),
        getRawOne: jest.fn().mockResolvedValue({ count: '15' }),
      };

      jest.spyOn(interactionRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder as any);
      jest.spyOn(interactionRepository, 'count').mockResolvedValue(15);

      const result = await service.getInteractionAnalytics('test-event-id');

      expect(result.totalInteractions).toBe(15);
      expect(result.uniqueParticipants).toBe(15);
      expect(result.interactionsByType).toEqual({
        chat: 10,
        qa: 5,
      });
    });
  });
});

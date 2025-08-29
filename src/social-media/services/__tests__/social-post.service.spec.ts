import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SocialPostService } from '../social-post.service';
import { SocialPost, PostStatus, PostType } from '../../entities/social-post.entity';
import { SocialAccount } from '../../entities/social-account.entity';
import { SocialMediaApiService } from '../social-media-api.service';

describe('SocialPostService', () => {
  let service: SocialPostService;
  let postRepository: Repository<SocialPost>;
  let accountRepository: Repository<SocialAccount>;
  let socialMediaApiService: SocialMediaApiService;

  const mockPost = {
    id: '1',
    accountId: 'account-1',
    content: 'Test post content',
    postType: PostType.TEXT,
    status: PostStatus.DRAFT,
    engagement: {
      likes: 0,
      comments: 0,
      shares: 0,
      clicks: 0,
      impressions: 0,
      reach: 0,
      saves: 0,
      lastUpdated: new Date(),
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAccount = {
    id: 'account-1',
    platform: 'facebook',
    accessToken: 'token',
    refreshToken: 'refresh-token',
    isActive: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialPostService,
        {
          provide: getRepositoryToken(SocialPost),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SocialAccount),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: SocialMediaApiService,
          useValue: {
            publishPost: jest.fn(),
            getPostEngagement: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SocialPostService>(SocialPostService);
    postRepository = module.get<Repository<SocialPost>>(getRepositoryToken(SocialPost));
    accountRepository = module.get<Repository<SocialAccount>>(getRepositoryToken(SocialAccount));
    socialMediaApiService = module.get<SocialMediaApiService>(SocialMediaApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPost', () => {
    it('should create a new social post', async () => {
      const createDto = {
        accountId: 'account-1',
        postType: PostType.TEXT,
        content: 'Test post content',
      };

      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount as any);
      jest.spyOn(postRepository, 'create').mockReturnValue(mockPost as any);
      jest.spyOn(postRepository, 'save').mockResolvedValue(mockPost as any);

      const result = await service.createPost(createDto);

      expect(postRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: PostStatus.DRAFT,
        engagement: expect.any(Object),
        aiGenerated: expect.any(Object),
      });
      expect(postRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockPost);
    });

    it('should throw error if account not found', async () => {
      const createDto = {
        accountId: 'invalid-account',
        postType: PostType.TEXT,
        content: 'Test post content',
      };

      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createPost(createDto)).rejects.toThrow('Social account with ID invalid-account not found');
    });
  });

  describe('publishPost', () => {
    it('should publish a post successfully', async () => {
      const publishedPost = { ...mockPost, status: PostStatus.PUBLISHED, platformPostId: 'platform-123' };

      jest.spyOn(service, 'findPostById').mockResolvedValue(mockPost as any);
      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount as any);
      jest.spyOn(socialMediaApiService, 'publishPost').mockResolvedValue({
        success: true,
        platformPostId: 'platform-123',
        platformUrl: 'https://facebook.com/123',
      });
      jest.spyOn(postRepository, 'save').mockResolvedValue(publishedPost as any);

      const result = await service.publishPost('1');

      expect(socialMediaApiService.publishPost).toHaveBeenCalled();
      expect(result.status).toBe(PostStatus.PUBLISHED);
      expect(result.platformPostId).toBe('platform-123');
    });

    it('should handle publish failure', async () => {
      const failedPost = { ...mockPost, status: PostStatus.FAILED, errorMessage: 'API Error' };

      jest.spyOn(service, 'findPostById').mockResolvedValue(mockPost as any);
      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount as any);
      jest.spyOn(socialMediaApiService, 'publishPost').mockResolvedValue({
        success: false,
        error: 'API Error',
      });
      jest.spyOn(postRepository, 'save').mockResolvedValue(failedPost as any);

      const result = await service.publishPost('1');

      expect(result.status).toBe(PostStatus.FAILED);
      expect(result.errorMessage).toBe('API Error');
    });
  });

  describe('schedulePost', () => {
    it('should schedule a post for future publishing', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const scheduledPost = { ...mockPost, status: PostStatus.SCHEDULED, scheduledFor: futureDate };

      jest.spyOn(service, 'findPostById').mockResolvedValue(mockPost as any);
      jest.spyOn(postRepository, 'save').mockResolvedValue(scheduledPost as any);

      const result = await service.schedulePost('1', futureDate);

      expect(result.status).toBe(PostStatus.SCHEDULED);
      expect(result.scheduledFor).toBe(futureDate);
    });

    it('should throw error for past date', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

      jest.spyOn(service, 'findPostById').mockResolvedValue(mockPost as any);

      await expect(service.schedulePost('1', pastDate)).rejects.toThrow('Scheduled time must be in the future');
    });
  });

  describe('updateEngagementMetrics', () => {
    it('should update engagement metrics from platform', async () => {
      const publishedPost = {
        ...mockPost,
        status: PostStatus.PUBLISHED,
        platformPostId: 'platform-123',
      };

      const engagementData = {
        likes: 50,
        comments: 10,
        shares: 5,
        impressions: 1000,
      };

      jest.spyOn(service, 'findPostById').mockResolvedValue(publishedPost as any);
      jest.spyOn(accountRepository, 'findOne').mockResolvedValue(mockAccount as any);
      jest.spyOn(socialMediaApiService, 'getPostEngagement').mockResolvedValue(engagementData);
      jest.spyOn(postRepository, 'save').mockResolvedValue({
        ...publishedPost,
        engagement: { ...publishedPost.engagement, ...engagementData },
      } as any);

      const result = await service.updateEngagementMetrics('1');

      expect(socialMediaApiService.getPostEngagement).toHaveBeenCalledWith(
        mockAccount.platform,
        expect.any(Object),
        'platform-123',
      );
      expect(postRepository.save).toHaveBeenCalled();
    });
  });

  describe('generateAIContent', () => {
    it('should generate AI content for social post', async () => {
      const result = await service.generateAIContent(
        'Promote our amazing event',
        PostType.TEXT,
        'facebook',
      );

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('hashtags');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.hashtags)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('duplicatePost', () => {
    it('should create a duplicate of existing post', async () => {
      const duplicatedPost = { ...mockPost, id: '2', content: 'Test post content (Copy)' };

      jest.spyOn(service, 'findPostById').mockResolvedValue(mockPost as any);
      jest.spyOn(postRepository, 'create').mockReturnValue(duplicatedPost as any);
      jest.spyOn(postRepository, 'save').mockResolvedValue(duplicatedPost as any);

      const result = await service.duplicatePost('1');

      expect(result.content).toContain('(Copy)');
      expect(result.status).toBe(PostStatus.DRAFT);
    });
  });
});

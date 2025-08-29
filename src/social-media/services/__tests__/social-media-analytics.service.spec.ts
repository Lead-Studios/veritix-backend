import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SocialMediaAnalyticsService } from '../social-media-analytics.service';
import { SocialPost, PostStatus } from '../../entities/social-post.entity';
import { SocialCampaign, CampaignStatus } from '../../entities/social-campaign.entity';
import { ReferralProgram } from '../../entities/referral-program.entity';
import { ReferralTracking, TrackingStatus } from '../../entities/referral-tracking.entity';
import { SocialProof, ProofStatus } from '../../entities/social-proof.entity';
import { InfluencerCollaboration, CollaborationStatus } from '../../entities/influencer-collaboration.entity';
import { UserGeneratedContent, ContentStatus } from '../../entities/user-generated-content.entity';

describe('SocialMediaAnalyticsService', () => {
  let service: SocialMediaAnalyticsService;
  let postRepository: Repository<SocialPost>;
  let campaignRepository: Repository<SocialCampaign>;

  const mockPosts = [
    {
      id: 'post-1',
      status: PostStatus.PUBLISHED,
      engagement: { likes: 50, comments: 10, shares: 5, reach: 1000, engagement: 65 },
      account: { platform: 'facebook' },
    },
    {
      id: 'post-2',
      status: PostStatus.PUBLISHED,
      engagement: { likes: 30, comments: 8, shares: 3, reach: 800, engagement: 41 },
      account: { platform: 'instagram' },
    },
  ];

  const mockCampaigns = [
    {
      id: 'campaign-1',
      status: CampaignStatus.ACTIVE,
      budget: 1000,
      spentAmount: 500,
      analytics: { returnOnAdSpend: 2.5 },
    },
    {
      id: 'campaign-2',
      status: CampaignStatus.COMPLETED,
      budget: 2000,
      spentAmount: 1800,
      analytics: { returnOnAdSpend: 3.2 },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialMediaAnalyticsService,
        {
          provide: getRepositoryToken(SocialPost),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SocialCampaign),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReferralProgram),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReferralTracking),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SocialProof),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(InfluencerCollaboration),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserGeneratedContent),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SocialMediaAnalyticsService>(SocialMediaAnalyticsService);
    postRepository = module.get<Repository<SocialPost>>(getRepositoryToken(SocialPost));
    campaignRepository = module.get<Repository<SocialCampaign>>(getRepositoryToken(SocialCampaign));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      // Mock all repository calls
      jest.spyOn(postRepository, 'find').mockResolvedValue(mockPosts as any);
      jest.spyOn(campaignRepository, 'find').mockResolvedValue(mockCampaigns as any);
      
      // Mock other repositories to return empty arrays
      const mockRepositories = [
        'referralProgramRepository',
        'referralTrackingRepository', 
        'socialProofRepository',
        'influencerRepository',
        'ugcRepository',
      ];

      mockRepositories.forEach(repo => {
        const repository = service[repo] || { find: jest.fn() };
        if (repository.find) {
          jest.spyOn(repository, 'find').mockResolvedValue([]);
        }
      });

      const result = await service.getDashboard('organizer-1');

      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('campaigns');
      expect(result).toHaveProperty('referrals');
      expect(result).toHaveProperty('influencers');
      expect(result).toHaveProperty('socialProof');
      expect(result).toHaveProperty('ugc');

      expect(result.overview.totalPosts).toBe(2);
      expect(result.overview.totalEngagement).toBe(106);
      expect(result.overview.topPlatform).toBe('facebook');

      expect(result.campaigns.activeCampaigns).toBe(1);
      expect(result.campaigns.totalCampaigns).toBe(2);
    });
  });

  describe('getPostAnalytics', () => {
    it('should return detailed post analytics', async () => {
      const mockPost = {
        id: 'post-1',
        content: 'Test post content for analytics',
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        engagement: {
          likes: 50,
          comments: 10,
          shares: 5,
          clicks: 20,
          impressions: 1000,
          reach: 800,
        },
        account: { platform: 'facebook' },
      };

      jest.spyOn(postRepository, 'findOne').mockResolvedValue(mockPost as any);
      jest.spyOn(postRepository, 'find').mockResolvedValue([mockPost] as any);

      const result = await service.getPostAnalytics('post-1', true);

      expect(result).toHaveProperty('post');
      expect(result).toHaveProperty('engagement');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('comparison');
      expect(result).toHaveProperty('timeSeries');

      expect(result.post.id).toBe('post-1');
      expect(result.engagement.likes).toBe(50);
      expect(result.performance).toHaveProperty('engagementRate');
      expect(result.performance).toHaveProperty('clickThroughRate');
      expect(result.performance).toHaveProperty('viralityScore');
    });

    it('should return null for non-existent post', async () => {
      jest.spyOn(postRepository, 'findOne').mockResolvedValue(null);

      const result = await service.getPostAnalytics('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getCampaignAnalytics', () => {
    it('should return detailed campaign analytics', async () => {
      const mockCampaign = {
        id: 'campaign-1',
        name: 'Test Campaign',
        status: CampaignStatus.ACTIVE,
        budget: 1000,
        spentAmount: 500,
        startDate: new Date(),
        endDate: new Date(),
        targeting: { demographics: { ageRange: '25-34' } },
        contentStrategy: { themes: ['event', 'promotion'] },
      };

      const campaignPosts = [
        {
          status: PostStatus.PUBLISHED,
          engagement: { engagement: 50, reach: 500, clicks: 25 },
        },
        {
          status: PostStatus.PUBLISHED,
          engagement: { engagement: 30, reach: 300, clicks: 15 },
        },
      ];

      jest.spyOn(campaignRepository, 'findOne').mockResolvedValue(mockCampaign as any);
      jest.spyOn(postRepository, 'find').mockResolvedValue(campaignPosts as any);

      const result = await service.getCampaignAnalytics('campaign-1', true);

      expect(result).toHaveProperty('campaign');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('targeting');
      expect(result).toHaveProperty('contentStrategy');
      expect(result).toHaveProperty('postBreakdown');

      expect(result.campaign.id).toBe('campaign-1');
      expect(result.performance.totalPosts).toBe(2);
      expect(result.performance.publishedPosts).toBe(2);
      expect(result.performance.totalEngagement).toBe(80);
    });
  });

  describe('getCompetitorAnalysis', () => {
    it('should return competitor analysis data', async () => {
      const competitors = ['competitor1', 'competitor2'];

      const result = await service.getCompetitorAnalysis('organizer-1', competitors);

      expect(result).toHaveProperty('organizer');
      expect(result).toHaveProperty('competitors');
      expect(result).toHaveProperty('insights');

      expect(result.organizer.id).toBe('organizer-1');
      expect(result.competitors).toHaveLength(2);
      expect(Array.isArray(result.insights)).toBe(true);

      // Check competitor data structure
      result.competitors.forEach(competitor => {
        expect(competitor).toHaveProperty('name');
        expect(competitor).toHaveProperty('totalFollowers');
        expect(competitor).toHaveProperty('averageEngagement');
        expect(competitor).toHaveProperty('postFrequency');
      });
    });
  });

  describe('calculateEngagementRate', () => {
    it('should calculate engagement rate correctly', () => {
      const engagement = {
        likes: 50,
        comments: 10,
        shares: 5,
        reach: 1000,
      };

      const rate = service['calculateEngagementRate'](engagement);

      expect(rate).toBe(6.5); // (50 + 10 + 5) / 1000 * 100
    });

    it('should return 0 for no reach', () => {
      const engagement = {
        likes: 50,
        comments: 10,
        shares: 5,
        reach: 0,
      };

      const rate = service['calculateEngagementRate'](engagement);

      expect(rate).toBe(0);
    });
  });

  describe('calculateCTR', () => {
    it('should calculate click-through rate correctly', () => {
      const engagement = {
        clicks: 25,
        impressions: 1000,
      };

      const ctr = service['calculateCTR'](engagement);

      expect(ctr).toBe(2.5); // 25 / 1000 * 100
    });

    it('should return 0 for no impressions', () => {
      const engagement = {
        clicks: 25,
        impressions: 0,
      };

      const ctr = service['calculateCTR'](engagement);

      expect(ctr).toBe(0);
    });
  });

  describe('calculateViralityScore', () => {
    it('should calculate virality score correctly', () => {
      const engagement = {
        shares: 10,
        reach: 1000,
      };

      const score = service['calculateViralityScore'](engagement);

      expect(score).toBe(1); // 10 / 1000 * 100
    });
  });
});

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { SocialPost, PostStatus, PostType } from '../entities/social-post.entity';
import { SocialAccount } from '../entities/social-account.entity';
import { SocialMediaApiService, PostData, PostResult } from './social-media-api.service';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface CreateSocialPostDto {
  accountId: string;
  campaignId?: string;
  eventId?: string;
  postType: PostType;
  content: string;
  mediaUrls?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    altText?: string;
  }>;
  scheduledFor?: Date;
  targeting?: any;
  hashtags?: string[];
  mentions?: string[];
  crossPost?: {
    enabled: boolean;
    platforms: string[];
  };
}

export interface UpdateSocialPostDto {
  content?: string;
  mediaUrls?: Array<{
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
    altText?: string;
  }>;
  scheduledFor?: Date;
  hashtags?: string[];
  mentions?: string[];
}

@Injectable()
export class SocialPostService {
  private readonly logger = new Logger(SocialPostService.name);

  constructor(
    @InjectRepository(SocialPost)
    private readonly postRepository: Repository<SocialPost>,
    @InjectRepository(SocialAccount)
    private readonly accountRepository: Repository<SocialAccount>,
    private readonly socialMediaApiService: SocialMediaApiService,
    private readonly configService: ConfigService,
  ) {}

  async createPost(dto: CreateSocialPostDto): Promise<SocialPost> {
    const account = await this.accountRepository.findOne({
      where: { id: dto.accountId },
    });

    if (!account) {
      throw new NotFoundException(`Social account with ID ${dto.accountId} not found`);
    }

    const post = this.postRepository.create({
      ...dto,
      status: dto.scheduledFor ? PostStatus.SCHEDULED : PostStatus.DRAFT,
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
      aiGenerated: {
        isGenerated: false,
        confidence: 0,
        suggestions: [],
      },
    });

    const savedPost = await this.postRepository.save(post);
    this.logger.log(`Created social post: ${savedPost.id}`);
    return savedPost;
  }

  async findPostById(id: string): Promise<SocialPost> {
    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['account', 'campaign'],
    });

    if (!post) {
      throw new NotFoundException(`Social post with ID ${id} not found`);
    }

    return post;
  }

  async findPostsByAccount(accountId: string): Promise<SocialPost[]> {
    return this.postRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
      relations: ['campaign'],
    });
  }

  async findPostsByCampaign(campaignId: string): Promise<SocialPost[]> {
    return this.postRepository.find({
      where: { campaignId },
      order: { scheduledFor: 'ASC' },
      relations: ['account'],
    });
  }

  async findPostsByEvent(eventId: string): Promise<SocialPost[]> {
    return this.postRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      relations: ['account', 'campaign'],
    });
  }

  async updatePost(id: string, dto: UpdateSocialPostDto): Promise<SocialPost> {
    const post = await this.findPostById(id);

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Cannot update published posts');
    }

    Object.assign(post, dto);

    if (dto.scheduledFor && post.status === PostStatus.DRAFT) {
      post.status = PostStatus.SCHEDULED;
    }

    return this.postRepository.save(post);
  }

  async publishPost(id: string): Promise<SocialPost> {
    const post = await this.findPostById(id);

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Post is already published');
    }

    const account = await this.accountRepository.findOne({
      where: { id: post.accountId },
    });

    if (!account) {
      throw new NotFoundException('Associated social account not found');
    }

    try {
      const postData: PostData = {
        content: post.content,
        media: post.mediaUrls,
        link: post.linkUrl,
        targeting: post.targeting,
      };

      const credentials = {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        appId: account.appId,
        appSecret: account.appSecret,
        pageId: account.pageId,
        businessAccountId: account.businessAccountId,
      };

      const result: PostResult = await this.socialMediaApiService.publishPost(
        account.platform,
        credentials,
        postData,
      );

      if (result.success) {
        post.status = PostStatus.PUBLISHED;
        post.platformPostId = result.platformPostId;
        post.platformUrl = result.platformUrl;
        post.publishedAt = new Date();

        // Handle cross-posting
        if (post.crossPost?.enabled && post.crossPost.platforms?.length > 0) {
          await this.handleCrossPosting(post, postData);
        }
      } else {
        post.status = PostStatus.FAILED;
        post.errorMessage = result.error;
      }

      const savedPost = await this.postRepository.save(post);
      this.logger.log(`Published social post: ${savedPost.id} to ${account.platform}`);
      return savedPost;
    } catch (error) {
      post.status = PostStatus.FAILED;
      post.errorMessage = error.message;
      await this.postRepository.save(post);
      
      this.logger.error(`Failed to publish post ${id}:`, error);
      throw error;
    }
  }

  async schedulePost(id: string, scheduledFor: Date): Promise<SocialPost> {
    const post = await this.findPostById(id);

    if (post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException('Cannot reschedule published posts');
    }

    if (scheduledFor <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    post.scheduledFor = scheduledFor;
    post.status = PostStatus.SCHEDULED;

    return this.postRepository.save(post);
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.findPostById(id);

    if (post.status === PostStatus.PUBLISHED && post.platformPostId) {
      // Note: Most platforms don't allow deletion via API
      this.logger.warn(`Cannot delete published post ${id} from platform`);
    }

    await this.postRepository.remove(post);
    this.logger.log(`Deleted social post: ${id}`);
  }

  async duplicatePost(id: string): Promise<SocialPost> {
    const originalPost = await this.findPostById(id);

    const duplicatedPost = this.postRepository.create({
      accountId: originalPost.accountId,
      campaignId: originalPost.campaignId,
      eventId: originalPost.eventId,
      postType: originalPost.postType,
      content: `${originalPost.content} (Copy)`,
      mediaUrls: originalPost.mediaUrls,
      hashtags: originalPost.hashtags,
      mentions: originalPost.mentions,
      targeting: originalPost.targeting,
      crossPost: originalPost.crossPost,
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
    });

    const savedPost = await this.postRepository.save(duplicatedPost);
    this.logger.log(`Duplicated social post: ${originalPost.id} -> ${savedPost.id}`);
    return savedPost;
  }

  async updateEngagementMetrics(id: string): Promise<SocialPost> {
    const post = await this.findPostById(id);

    if (post.status !== PostStatus.PUBLISHED || !post.platformPostId) {
      return post;
    }

    const account = await this.accountRepository.findOne({
      where: { id: post.accountId },
    });

    if (!account) {
      return post;
    }

    try {
      const credentials = {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        appId: account.appId,
        appSecret: account.appSecret,
      };

      const engagement = await this.socialMediaApiService.getPostEngagement(
        account.platform,
        credentials,
        post.platformPostId,
      );

      if (engagement) {
        post.engagement = {
          ...post.engagement,
          ...engagement,
          lastUpdated: new Date(),
        };

        await this.postRepository.save(post);
        this.logger.log(`Updated engagement metrics for post: ${id}`);
      }
    } catch (error) {
      this.logger.error(`Failed to update engagement for post ${id}:`, error);
    }

    return post;
  }

  async generateAIContent(
    prompt: string,
    postType: PostType,
    platform: string,
    eventContext?: any,
  ): Promise<{
    content: string;
    hashtags: string[];
    confidence: number;
    suggestions: string[];
  }> {
    // This would integrate with an AI service like OpenAI
    // For now, returning mock data
    const mockContent = {
      content: `🎉 Don't miss out on this amazing event! ${prompt}`,
      hashtags: ['#event', '#dontmiss', '#amazing'],
      confidence: 0.85,
      suggestions: [
        'Add more emojis for better engagement',
        'Consider mentioning the date and location',
        'Include a call-to-action',
      ],
    };

    this.logger.log(`Generated AI content for ${platform} ${postType}`);
    return mockContent;
  }

  async optimizePostTiming(accountId: string, postType: PostType): Promise<Date[]> {
    // This would analyze historical engagement data to suggest optimal posting times
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Social account not found');
    }

    // Mock optimal times based on platform
    const optimalTimes: Date[] = [];
    const now = new Date();
    
    // Suggest times for the next 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      
      // Different optimal times based on platform
      switch (account.platform) {
        case 'facebook':
          date.setHours(9, 0, 0, 0); // 9 AM
          break;
        case 'instagram':
          date.setHours(11, 0, 0, 0); // 11 AM
          break;
        case 'twitter':
          date.setHours(12, 0, 0, 0); // 12 PM
          break;
        case 'linkedin':
          date.setHours(8, 0, 0, 0); // 8 AM
          break;
        default:
          date.setHours(10, 0, 0, 0); // 10 AM
      }
      
      optimalTimes.push(date);
    }

    return optimalTimes;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledPosts(): Promise<void> {
    const now = new Date();
    const scheduledPosts = await this.postRepository.find({
      where: {
        status: PostStatus.SCHEDULED,
      },
      relations: ['account'],
    });

    const postsToPublish = scheduledPosts.filter(
      post => post.scheduledFor && post.scheduledFor <= now
    );

    for (const post of postsToPublish) {
      try {
        await this.publishPost(post.id);
        this.logger.log(`Auto-published scheduled post: ${post.id}`);
      } catch (error) {
        this.logger.error(`Failed to auto-publish post ${post.id}:`, error);
      }
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateAllEngagementMetrics(): Promise<void> {
    const publishedPosts = await this.postRepository.find({
      where: {
        status: PostStatus.PUBLISHED,
      },
      take: 100, // Process in batches
      order: { publishedAt: 'DESC' },
    });

    for (const post of publishedPosts) {
      try {
        await this.updateEngagementMetrics(post.id);
      } catch (error) {
        this.logger.error(`Failed to update engagement for post ${post.id}:`, error);
      }
    }

    this.logger.log(`Updated engagement metrics for ${publishedPosts.length} posts`);
  }

  private async handleCrossPosting(post: SocialPost, postData: PostData): Promise<void> {
    if (!post.crossPost?.enabled || !post.crossPost.platforms?.length) {
      return;
    }

    // Get accounts for cross-posting platforms
    const crossPostAccounts = await this.accountRepository.find({
      where: {
        platform: In(post.crossPost.platforms),
        organizerId: post.account?.organizerId, // Assuming we have this relation
        isActive: true,
      },
    });

    for (const account of crossPostAccounts) {
      try {
        const credentials = {
          accessToken: account.accessToken,
          refreshToken: account.refreshToken,
          appId: account.appId,
          appSecret: account.appSecret,
          pageId: account.pageId,
          businessAccountId: account.businessAccountId,
        };

        const result = await this.socialMediaApiService.publishPost(
          account.platform,
          credentials,
          postData,
        );

        if (result.success) {
          // Create a new post record for the cross-posted content
          const crossPost = this.postRepository.create({
            accountId: account.id,
            campaignId: post.campaignId,
            eventId: post.eventId,
            postType: post.postType,
            content: post.content,
            mediaUrls: post.mediaUrls,
            hashtags: post.hashtags,
            mentions: post.mentions,
            status: PostStatus.PUBLISHED,
            platformPostId: result.platformPostId,
            platformUrl: result.platformUrl,
            publishedAt: new Date(),
            parentPostId: post.id,
          });

          await this.postRepository.save(crossPost);
          this.logger.log(`Cross-posted to ${account.platform}: ${crossPost.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to cross-post to ${account.platform}:`, error);
      }
    }
  }
}

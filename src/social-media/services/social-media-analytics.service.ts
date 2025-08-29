import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { SocialPost, PostStatus } from '../entities/social-post.entity';
import { SocialCampaign, CampaignStatus } from '../entities/social-campaign.entity';
import { ReferralProgram } from '../entities/referral-program.entity';
import { ReferralTracking, TrackingStatus } from '../entities/referral-tracking.entity';
import { SocialProof, ProofStatus } from '../entities/social-proof.entity';
import { InfluencerCollaboration, CollaborationStatus } from '../entities/influencer-collaboration.entity';
import { UserGeneratedContent, ContentStatus } from '../entities/user-generated-content.entity';

export interface AnalyticsDateRange {
  start: Date;
  end: Date;
}

export interface SocialMediaDashboard {
  overview: {
    totalPosts: number;
    totalEngagement: number;
    totalReach: number;
    totalClicks: number;
    engagementRate: number;
    topPlatform: string;
  };
  campaigns: {
    activeCampaigns: number;
    totalCampaigns: number;
    averageROI: number;
    topPerformingCampaign: any;
  };
  referrals: {
    activePrograms: number;
    totalConversions: number;
    totalRevenue: number;
    conversionRate: number;
  };
  influencers: {
    activeCollaborations: number;
    totalReach: number;
    averageEngagement: number;
    topInfluencer: any;
  };
  socialProof: {
    totalProofs: number;
    approvedProofs: number;
    averageCTR: number;
    topProofType: string;
  };
  ugc: {
    totalContent: number;
    approvedContent: number;
    averageQualityScore: number;
    topPlatform: string;
  };
}

@Injectable()
export class SocialMediaAnalyticsService {
  private readonly logger = new Logger(SocialMediaAnalyticsService.name);

  constructor(
    @InjectRepository(SocialPost)
    private readonly postRepository: Repository<SocialPost>,
    @InjectRepository(SocialCampaign)
    private readonly campaignRepository: Repository<SocialCampaign>,
    @InjectRepository(ReferralProgram)
    private readonly referralProgramRepository: Repository<ReferralProgram>,
    @InjectRepository(ReferralTracking)
    private readonly referralTrackingRepository: Repository<ReferralTracking>,
    @InjectRepository(SocialProof)
    private readonly socialProofRepository: Repository<SocialProof>,
    @InjectRepository(InfluencerCollaboration)
    private readonly influencerRepository: Repository<InfluencerCollaboration>,
    @InjectRepository(UserGeneratedContent)
    private readonly ugcRepository: Repository<UserGeneratedContent>,
  ) {}

  async getDashboard(
    organizerId: string,
    dateRange?: AnalyticsDateRange,
  ): Promise<SocialMediaDashboard> {
    const whereClause: any = { organizerId };
    
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const [
      posts,
      campaigns,
      referralPrograms,
      referralTracking,
      socialProofs,
      influencerCollabs,
      ugcContent,
    ] = await Promise.all([
      this.postRepository.find({ where: whereClause }),
      this.campaignRepository.find({ where: whereClause }),
      this.referralProgramRepository.find({ where: whereClause }),
      this.referralTrackingRepository.find({ where: whereClause }),
      this.socialProofRepository.find({ where: whereClause }),
      this.influencerRepository.find({ where: whereClause }),
      this.ugcRepository.find({ where: whereClause }),
    ]);

    return {
      overview: this.calculateOverviewMetrics(posts),
      campaigns: this.calculateCampaignMetrics(campaigns),
      referrals: this.calculateReferralMetrics(referralPrograms, referralTracking),
      influencers: this.calculateInfluencerMetrics(influencerCollabs),
      socialProof: this.calculateSocialProofMetrics(socialProofs),
      ugc: this.calculateUGCMetrics(ugcContent),
    };
  }

  async getPostAnalytics(
    postId: string,
    includeTimeSeries: boolean = false,
  ): Promise<any> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['account', 'campaign'],
    });

    if (!post) {
      return null;
    }

    const analytics = {
      post: {
        id: post.id,
        content: post.content.substring(0, 100),
        platform: post.account?.platform,
        status: post.status,
        publishedAt: post.publishedAt,
      },
      engagement: post.engagement,
      performance: {
        engagementRate: this.calculateEngagementRate(post.engagement),
        clickThroughRate: this.calculateCTR(post.engagement),
        viralityScore: this.calculateViralityScore(post.engagement),
      },
      comparison: await this.getPostComparison(post),
    };

    if (includeTimeSeries) {
      analytics['timeSeries'] = await this.getPostTimeSeriesData(postId);
    }

    return analytics;
  }

  async getCampaignAnalytics(
    campaignId: string,
    includePostBreakdown: boolean = false,
  ): Promise<any> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
      relations: ['posts', 'account'],
    });

    if (!campaign) {
      return null;
    }

    const posts = await this.postRepository.find({
      where: { campaignId },
    });

    const analytics = {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget,
        spentAmount: campaign.spentAmount,
        startDate: campaign.startDate,
        endDate: campaign.endDate,
      },
      performance: {
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === PostStatus.PUBLISHED).length,
        totalEngagement: posts.reduce((sum, p) => sum + (p.engagement?.engagement || 0), 0),
        totalReach: posts.reduce((sum, p) => sum + (p.engagement?.reach || 0), 0),
        totalClicks: posts.reduce((sum, p) => sum + (p.engagement?.clicks || 0), 0),
        averageEngagementRate: this.calculateAverageEngagementRate(posts),
        roi: this.calculateCampaignROI(campaign, posts),
        costPerEngagement: this.calculateCostPerEngagement(campaign, posts),
      },
      targeting: campaign.targeting,
      contentStrategy: campaign.contentStrategy,
    };

    if (includePostBreakdown) {
      analytics['postBreakdown'] = posts.map(post => ({
        id: post.id,
        content: post.content.substring(0, 50),
        status: post.status,
        engagement: post.engagement,
        publishedAt: post.publishedAt,
      }));
    }

    return analytics;
  }

  async getReferralAnalytics(
    programId: string,
    dateRange?: AnalyticsDateRange,
  ): Promise<any> {
    const program = await this.referralProgramRepository.findOne({
      where: { id: programId },
    });

    if (!program) {
      return null;
    }

    const whereClause: any = { programId };
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const trackingRecords = await this.referralTrackingRepository.find({
      where: whereClause,
    });

    const clicks = trackingRecords.filter(t => t.status === TrackingStatus.CLICKED);
    const conversions = trackingRecords.filter(t => t.status === TrackingStatus.CONVERTED);

    return {
      program: {
        id: program.id,
        name: program.name,
        status: program.status,
        rewardType: program.rewardType,
        rewardValue: program.rewardValue,
      },
      performance: {
        totalClicks: clicks.length,
        totalConversions: conversions.length,
        conversionRate: clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0,
        totalRevenue: conversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0),
        averageOrderValue: conversions.length > 0 
          ? conversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0) / conversions.length 
          : 0,
      },
      sources: this.analyzeReferralSources(trackingRecords),
      timeSeriesData: this.generateReferralTimeSeries(trackingRecords, dateRange),
    };
  }

  async getInfluencerAnalytics(
    collaborationId: string,
  ): Promise<any> {
    const collaboration = await this.influencerRepository.findOne({
      where: { id: collaborationId },
    });

    if (!collaboration) {
      return null;
    }

    return {
      collaboration: {
        id: collaboration.id,
        title: collaboration.title,
        status: collaboration.status,
        tier: collaboration.tier,
        influencerName: collaboration.influencerProfile.name,
        totalFollowers: collaboration.totalFollowers,
        averageEngagementRate: collaboration.averageEngagementRate,
      },
      performance: collaboration.performance,
      deliverables: {
        total: collaboration.deliverables.length,
        completed: collaboration.completedDeliverables,
        pending: collaboration.pendingDeliverables,
        completionRate: collaboration.deliverables.length > 0 
          ? (collaboration.completedDeliverables / collaboration.deliverables.length) * 100 
          : 0,
      },
      roi: collaboration.roi,
      compensation: collaboration.compensation,
    };
  }

  async getSocialProofAnalytics(
    eventId: string,
    dateRange?: AnalyticsDateRange,
  ): Promise<any> {
    const whereClause: any = { eventId };
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const proofs = await this.socialProofRepository.find({
      where: whereClause,
    });

    const typeBreakdown = {};
    const platformBreakdown = {};
    let totalDisplays = 0;
    let totalClicks = 0;

    for (const proof of proofs) {
      typeBreakdown[proof.proofType] = (typeBreakdown[proof.proofType] || 0) + 1;
      if (proof.platform) {
        platformBreakdown[proof.platform] = (platformBreakdown[proof.platform] || 0) + 1;
      }
      totalDisplays += proof.displayCount;
      totalClicks += proof.clickCount;
    }

    return {
      overview: {
        totalProofs: proofs.length,
        approvedProofs: proofs.filter(p => p.status === ProofStatus.APPROVED).length,
        pendingProofs: proofs.filter(p => p.status === ProofStatus.PENDING).length,
        totalDisplays,
        totalClicks,
        averageCTR: totalDisplays > 0 ? (totalClicks / totalDisplays) * 100 : 0,
      },
      breakdown: {
        byType: typeBreakdown,
        byPlatform: platformBreakdown,
      },
      topPerforming: proofs
        .filter(p => p.displayCount > 0)
        .sort((a, b) => b.clickThroughRate - a.clickThroughRate)
        .slice(0, 10)
        .map(p => ({
          id: p.id,
          type: p.proofType,
          content: p.content.substring(0, 100),
          displayCount: p.displayCount,
          clickCount: p.clickCount,
          clickThroughRate: p.clickThroughRate,
        })),
    };
  }

  async getUGCAnalytics(
    eventId: string,
    dateRange?: AnalyticsDateRange,
  ): Promise<any> {
    const whereClause: any = { eventId };
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const content = await this.ugcRepository.find({
      where: whereClause,
    });

    const platformBreakdown = {};
    const typeBreakdown = {};
    let totalEngagement = 0;
    let totalQualityScore = 0;
    let qualityScoreCount = 0;

    for (const item of content) {
      if (item.platform) {
        platformBreakdown[item.platform] = (platformBreakdown[item.platform] || 0) + 1;
      }
      typeBreakdown[item.contentType] = (typeBreakdown[item.contentType] || 0) + 1;
      totalEngagement += item.totalEngagement;
      
      if (item.qualityScore) {
        totalQualityScore += item.qualityScore;
        qualityScoreCount++;
      }
    }

    return {
      overview: {
        totalContent: content.length,
        approvedContent: content.filter(c => c.status === ContentStatus.APPROVED).length,
        featuredContent: content.filter(c => c.status === ContentStatus.FEATURED).length,
        pendingContent: content.filter(c => c.status === ContentStatus.PENDING).length,
        totalEngagement,
        averageQualityScore: qualityScoreCount > 0 ? totalQualityScore / qualityScoreCount : 0,
      },
      breakdown: {
        byPlatform: platformBreakdown,
        byType: typeBreakdown,
      },
      topPerforming: content
        .filter(c => c.totalEngagement > 0)
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10)
        .map(c => ({
          id: c.id,
          title: c.title,
          platform: c.platform,
          contentType: c.contentType,
          engagement: c.totalEngagement,
          qualityScore: c.qualityScore,
          authorName: c.authorName,
        })),
    };
  }

  async getCompetitorAnalysis(
    organizerId: string,
    competitors: string[],
  ): Promise<any> {
    // This would integrate with social media monitoring tools
    // For now, returning mock comparative data
    return {
      organizer: {
        id: organizerId,
        totalFollowers: 45000,
        averageEngagement: 3.2,
        postFrequency: 12, // posts per week
      },
      competitors: competitors.map(comp => ({
        name: comp,
        totalFollowers: Math.floor(Math.random() * 100000) + 20000,
        averageEngagement: Math.random() * 5 + 1,
        postFrequency: Math.floor(Math.random() * 20) + 5,
      })),
      insights: [
        'Your engagement rate is above industry average',
        'Consider increasing post frequency to match top competitors',
        'Video content performs 40% better than image posts',
      ],
    };
  }

  private calculateOverviewMetrics(posts: SocialPost[]): any {
    const publishedPosts = posts.filter(p => p.status === PostStatus.PUBLISHED);
    
    const totalEngagement = publishedPosts.reduce(
      (sum, p) => sum + (p.engagement?.engagement || 0), 0
    );
    const totalReach = publishedPosts.reduce(
      (sum, p) => sum + (p.engagement?.reach || 0), 0
    );
    const totalClicks = publishedPosts.reduce(
      (sum, p) => sum + (p.engagement?.clicks || 0), 0
    );

    const platformCounts = {};
    for (const post of publishedPosts) {
      const platform = post.account?.platform || 'unknown';
      platformCounts[platform] = (platformCounts[platform] || 0) + 1;
    }

    const topPlatform = Object.entries(platformCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'none';

    return {
      totalPosts: publishedPosts.length,
      totalEngagement,
      totalReach,
      totalClicks,
      engagementRate: totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0,
      topPlatform,
    };
  }

  private calculateCampaignMetrics(campaigns: SocialCampaign[]): any {
    const activeCampaigns = campaigns.filter(c => c.status === CampaignStatus.ACTIVE).length;
    const completedCampaigns = campaigns.filter(c => c.status === CampaignStatus.COMPLETED);
    
    const averageROI = completedCampaigns.length > 0
      ? completedCampaigns.reduce((sum, c) => sum + (c.roi || 0), 0) / completedCampaigns.length
      : 0;

    const topPerformingCampaign = campaigns
      .filter(c => c.analytics?.returnOnAdSpend)
      .sort((a, b) => (b.analytics?.returnOnAdSpend || 0) - (a.analytics?.returnOnAdSpend || 0))[0];

    return {
      activeCampaigns,
      totalCampaigns: campaigns.length,
      averageROI,
      topPerformingCampaign: topPerformingCampaign ? {
        id: topPerformingCampaign.id,
        name: topPerformingCampaign.name,
        roi: topPerformingCampaign.roi,
      } : null,
    };
  }

  private calculateReferralMetrics(
    programs: ReferralProgram[],
    tracking: ReferralTracking[],
  ): any {
    const activePrograms = programs.filter(p => p.status === 'active').length;
    const conversions = tracking.filter(t => t.status === TrackingStatus.CONVERTED);
    const clicks = tracking.filter(t => t.status === TrackingStatus.CLICKED);
    
    const totalRevenue = conversions.reduce((sum, c) => sum + (c.conversionValue || 0), 0);
    const conversionRate = clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0;

    return {
      activePrograms,
      totalConversions: conversions.length,
      totalRevenue,
      conversionRate,
    };
  }

  private calculateInfluencerMetrics(collaborations: InfluencerCollaboration[]): any {
    const activeCollaborations = collaborations.filter(
      c => c.status === CollaborationStatus.ACTIVE
    ).length;

    const completedCollabs = collaborations.filter(
      c => c.status === CollaborationStatus.COMPLETED
    );

    const totalReach = completedCollabs.reduce(
      (sum, c) => sum + (c.performance?.reach || 0), 0
    );

    const totalEngagement = completedCollabs.reduce(
      (sum, c) => sum + (c.performance?.engagement || 0), 0
    );

    const averageEngagement = completedCollabs.length > 0 
      ? totalEngagement / completedCollabs.length 
      : 0;

    const topInfluencer = completedCollabs
      .sort((a, b) => (b.performance?.engagement || 0) - (a.performance?.engagement || 0))[0];

    return {
      activeCollaborations,
      totalReach,
      averageEngagement,
      topInfluencer: topInfluencer ? {
        name: topInfluencer.influencerProfile.name,
        engagement: topInfluencer.performance?.engagement || 0,
        tier: topInfluencer.tier,
      } : null,
    };
  }

  private calculateSocialProofMetrics(proofs: SocialProof[]): any {
    const approvedProofs = proofs.filter(p => p.status === ProofStatus.APPROVED).length;
    const totalDisplays = proofs.reduce((sum, p) => sum + p.displayCount, 0);
    const totalClicks = proofs.reduce((sum, p) => sum + p.clickCount, 0);
    
    const averageCTR = totalDisplays > 0 ? (totalClicks / totalDisplays) * 100 : 0;

    const typeCounts = {};
    for (const proof of proofs) {
      typeCounts[proof.proofType] = (typeCounts[proof.proofType] || 0) + 1;
    }

    const topProofType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'none';

    return {
      totalProofs: proofs.length,
      approvedProofs,
      averageCTR,
      topProofType,
    };
  }

  private calculateUGCMetrics(content: UserGeneratedContent[]): any {
    const approvedContent = content.filter(c => c.status === ContentStatus.APPROVED).length;
    
    const qualityScores = content.filter(c => c.qualityScore).map(c => c.qualityScore);
    const averageQualityScore = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;

    const platformCounts = {};
    for (const item of content) {
      if (item.platform) {
        platformCounts[item.platform] = (platformCounts[item.platform] || 0) + 1;
      }
    }

    const topPlatform = Object.entries(platformCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'none';

    return {
      totalContent: content.length,
      approvedContent,
      averageQualityScore,
      topPlatform,
    };
  }

  private calculateEngagementRate(engagement: any): number {
    if (!engagement || !engagement.reach) return 0;
    const totalEngagement = (engagement.likes || 0) + 
                           (engagement.comments || 0) + 
                           (engagement.shares || 0);
    return (totalEngagement / engagement.reach) * 100;
  }

  private calculateCTR(engagement: any): number {
    if (!engagement || !engagement.impressions || !engagement.clicks) return 0;
    return (engagement.clicks / engagement.impressions) * 100;
  }

  private calculateViralityScore(engagement: any): number {
    if (!engagement) return 0;
    const shares = engagement.shares || 0;
    const reach = engagement.reach || 0;
    return reach > 0 ? (shares / reach) * 100 : 0;
  }

  private calculateAverageEngagementRate(posts: SocialPost[]): number {
    const publishedPosts = posts.filter(p => p.status === PostStatus.PUBLISHED);
    if (publishedPosts.length === 0) return 0;

    const totalEngagementRate = publishedPosts.reduce(
      (sum, p) => sum + this.calculateEngagementRate(p.engagement), 0
    );

    return totalEngagementRate / publishedPosts.length;
  }

  private calculateCampaignROI(campaign: SocialCampaign, posts: SocialPost[]): number {
    const spent = campaign.spentAmount || 0;
    if (spent === 0) return 0;

    // This would integrate with actual conversion tracking
    // For now, using mock calculation based on engagement
    const totalEngagement = posts.reduce(
      (sum, p) => sum + (p.engagement?.engagement || 0), 0
    );
    
    const estimatedRevenue = totalEngagement * 0.05; // Mock conversion rate
    return ((estimatedRevenue - spent) / spent) * 100;
  }

  private calculateCostPerEngagement(campaign: SocialCampaign, posts: SocialPost[]): number {
    const spent = campaign.spentAmount || 0;
    const totalEngagement = posts.reduce(
      (sum, p) => sum + (p.engagement?.engagement || 0), 0
    );

    return totalEngagement > 0 ? spent / totalEngagement : 0;
  }

  private async getPostComparison(post: SocialPost): Promise<any> {
    // Compare with other posts from the same account
    const similarPosts = await this.postRepository.find({
      where: {
        accountId: post.accountId,
        status: PostStatus.PUBLISHED,
      },
      order: { publishedAt: 'DESC' },
      take: 10,
    });

    const avgEngagement = similarPosts.reduce(
      (sum, p) => sum + (p.engagement?.engagement || 0), 0
    ) / similarPosts.length;

    const currentEngagement = post.engagement?.engagement || 0;
    const performanceVsAverage = avgEngagement > 0 
      ? ((currentEngagement - avgEngagement) / avgEngagement) * 100 
      : 0;

    return {
      averageEngagement: avgEngagement,
      performanceVsAverage,
      ranking: similarPosts.findIndex(p => p.id === post.id) + 1,
    };
  }

  private async getPostTimeSeriesData(postId: string): Promise<any[]> {
    // This would integrate with platform APIs to get historical engagement data
    // For now, returning mock time series data
    const mockData = [];
    const now = new Date();
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      mockData.push({
        timestamp,
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20),
        shares: Math.floor(Math.random() * 10),
        reach: Math.floor(Math.random() * 1000) + 500,
      });
    }

    return mockData;
  }

  private analyzeReferralSources(tracking: ReferralTracking[]): any {
    const sources = {};
    const mediums = {};
    const campaigns = {};

    for (const record of tracking) {
      const source = record.sourceInfo?.utmSource || 'direct';
      const medium = record.sourceInfo?.utmMedium || 'none';
      const campaign = record.sourceInfo?.utmCampaign || 'none';

      sources[source] = (sources[source] || 0) + 1;
      mediums[medium] = (mediums[medium] || 0) + 1;
      campaigns[campaign] = (campaigns[campaign] || 0) + 1;
    }

    return { sources, mediums, campaigns };
  }

  private generateReferralTimeSeries(
    tracking: ReferralTracking[],
    dateRange?: AnalyticsDateRange,
  ): any[] {
    // Group tracking records by day
    const dailyData = {};
    
    for (const record of tracking) {
      const date = record.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { clicks: 0, conversions: 0 };
      }
      
      if (record.status === TrackingStatus.CLICKED) {
        dailyData[date].clicks++;
      } else if (record.status === TrackingStatus.CONVERTED) {
        dailyData[date].conversions++;
      }
    }

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }));
  }
}

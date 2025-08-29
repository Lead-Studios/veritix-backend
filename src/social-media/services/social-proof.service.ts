import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between } from 'typeorm';
import { SocialProof, ProofType, ProofStatus } from '../entities/social-proof.entity';
import { UserGeneratedContent, ContentStatus } from '../entities/user-generated-content.entity';

export interface CreateSocialProofDto {
  eventId?: string;
  userId?: string;
  organizerId?: string;
  proofType: ProofType;
  content: string;
  authorName?: string;
  authorUsername?: string;
  authorAvatarUrl?: string;
  platform?: string;
  sourceUrl?: string;
  mediaUrls?: string[];
  rating?: number;
  friendsData?: Array<{
    userId: string;
    name: string;
    avatarUrl?: string;
    mutualFriends?: number;
    attendanceStatus?: string;
  }>;
  metadata?: any;
}

export interface SocialProofWidget {
  type: 'friend_attendance' | 'recent_activity' | 'testimonials' | 'user_count';
  data: any;
  displaySettings: {
    maxItems: number;
    showAvatars: boolean;
    showTimestamp: boolean;
    autoRefresh: boolean;
  };
}

@Injectable()
export class SocialProofService {
  private readonly logger = new Logger(SocialProofService.name);

  constructor(
    @InjectRepository(SocialProof)
    private readonly proofRepository: Repository<SocialProof>,
    @InjectRepository(UserGeneratedContent)
    private readonly ugcRepository: Repository<UserGeneratedContent>,
  ) {}

  async createSocialProof(dto: CreateSocialProofDto): Promise<SocialProof> {
    const credibilityScore = await this.calculateCredibilityScore(dto);

    const proof = this.proofRepository.create({
      ...dto,
      status: ProofStatus.PENDING,
      credibilityScore,
      displayCount: 0,
      clickCount: 0,
      metrics: {
        reach: 0,
        impressions: 0,
        engagement: 0,
        clickThroughRate: 0,
        conversionRate: 0,
      },
    });

    const savedProof = await this.proofRepository.save(proof);
    this.logger.log(`Created social proof: ${savedProof.id}`);
    return savedProof;
  }

  async findProofById(id: string): Promise<SocialProof> {
    const proof = await this.proofRepository.findOne({
      where: { id },
    });

    if (!proof) {
      throw new NotFoundException(`Social proof with ID ${id} not found`);
    }

    return proof;
  }

  async findProofsByEvent(
    eventId: string,
    proofTypes?: ProofType[],
    limit: number = 50,
  ): Promise<SocialProof[]> {
    const whereClause: any = { 
      eventId,
      status: ProofStatus.APPROVED,
      isActive: true,
    };

    if (proofTypes && proofTypes.length > 0) {
      whereClause.proofType = In(proofTypes);
    }

    return this.proofRepository.find({
      where: whereClause,
      order: { 
        credibilityScore: 'DESC',
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  async getFriendAttendanceProof(
    eventId: string,
    userId: string,
    limit: number = 10,
  ): Promise<SocialProofWidget> {
    // This would integrate with user's social connections
    // For now, returning mock data structure
    const friendsAttending = await this.proofRepository.find({
      where: {
        eventId,
        proofType: ProofType.FRIEND_ATTENDANCE,
        status: ProofStatus.APPROVED,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      type: 'friend_attendance',
      data: {
        totalFriendsAttending: friendsAttending.length,
        friends: friendsAttending.map(proof => ({
          name: proof.authorName,
          avatarUrl: proof.authorAvatarUrl,
          mutualFriends: proof.friendsData?.[0]?.mutualFriends || 0,
          attendanceStatus: proof.friendsData?.[0]?.attendanceStatus || 'attending',
        })),
      },
      displaySettings: {
        maxItems: limit,
        showAvatars: true,
        showTimestamp: false,
        autoRefresh: true,
      },
    };
  }

  async getRecentActivityProof(
    eventId: string,
    limit: number = 5,
  ): Promise<SocialProofWidget> {
    const recentActivity = await this.proofRepository.find({
      where: {
        eventId,
        proofType: In([
          ProofType.SOCIAL_MENTION,
          ProofType.REVIEW,
          ProofType.USER_COUNT,
        ]),
        status: ProofStatus.APPROVED,
      },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      type: 'recent_activity',
      data: {
        activities: recentActivity.map(proof => ({
          id: proof.id,
          type: proof.proofType,
          content: proof.content,
          authorName: proof.authorName,
          authorAvatarUrl: proof.authorAvatarUrl,
          platform: proof.platform,
          timestamp: proof.createdAt,
          engagement: proof.totalEngagement,
        })),
      },
      displaySettings: {
        maxItems: limit,
        showAvatars: true,
        showTimestamp: true,
        autoRefresh: true,
      },
    };
  }

  async getTestimonialsWidget(
    eventId: string,
    limit: number = 3,
  ): Promise<SocialProofWidget> {
    const testimonials = await this.proofRepository.find({
      where: {
        eventId,
        proofType: In([ProofType.TESTIMONIAL, ProofType.REVIEW]),
        status: ProofStatus.APPROVED,
        rating: 4, // Only high-rated testimonials
      },
      order: { 
        rating: 'DESC',
        credibilityScore: 'DESC',
      },
      take: limit,
    });

    return {
      type: 'testimonials',
      data: {
        testimonials: testimonials.map(proof => ({
          id: proof.id,
          content: proof.content,
          authorName: proof.authorName,
          authorAvatarUrl: proof.authorAvatarUrl,
          rating: proof.rating,
          platform: proof.platform,
          verified: proof.metadata?.verified || false,
        })),
        averageRating: testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / testimonials.length,
      },
      displaySettings: {
        maxItems: limit,
        showAvatars: true,
        showTimestamp: false,
        autoRefresh: false,
      },
    };
  }

  async getUserCountWidget(eventId: string): Promise<SocialProofWidget> {
    // This would integrate with actual ticket sales and registration data
    const userCountProof = await this.proofRepository.findOne({
      where: {
        eventId,
        proofType: ProofType.USER_COUNT,
        status: ProofStatus.APPROVED,
      },
      order: { createdAt: 'DESC' },
    });

    // Mock data - in real implementation, this would come from event registration system
    const mockData = {
      totalRegistered: 1247,
      recentRegistrations: 23,
      timeframe: '24 hours',
      trending: true,
    };

    return {
      type: 'user_count',
      data: userCountProof?.metadata || mockData,
      displaySettings: {
        maxItems: 1,
        showAvatars: false,
        showTimestamp: true,
        autoRefresh: true,
      },
    };
  }

  async approveProof(id: string): Promise<SocialProof> {
    const proof = await this.findProofById(id);
    proof.status = ProofStatus.APPROVED;
    
    return this.proofRepository.save(proof);
  }

  async rejectProof(id: string, reason?: string): Promise<SocialProof> {
    const proof = await this.findProofById(id);
    proof.status = ProofStatus.REJECTED;
    
    if (reason) {
      proof.metadata = { ...proof.metadata, rejectionReason: reason };
    }
    
    return this.proofRepository.save(proof);
  }

  async trackProofDisplay(id: string): Promise<void> {
    await this.proofRepository.increment(
      { id },
      'displayCount',
      1,
    );

    await this.proofRepository.update(
      { id },
      { lastDisplayedAt: new Date() },
    );
  }

  async trackProofClick(id: string): Promise<void> {
    await this.proofRepository.increment(
      { id },
      'clickCount',
      1,
    );

    // Update click-through rate
    const proof = await this.findProofById(id);
    const ctr = proof.displayCount > 0 ? (proof.clickCount / proof.displayCount) * 100 : 0;
    
    await this.proofRepository.update(
      { id },
      {
        metrics: {
          ...proof.metrics,
          clickThroughRate: ctr,
        },
      },
    );
  }

  async getProofAnalytics(
    eventId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<any> {
    const whereClause: any = { eventId };
    
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const proofs = await this.proofRepository.find({
      where: whereClause,
    });

    const analytics = {
      totalProofs: proofs.length,
      approvedProofs: proofs.filter(p => p.status === ProofStatus.APPROVED).length,
      pendingProofs: proofs.filter(p => p.status === ProofStatus.PENDING).length,
      totalDisplays: proofs.reduce((sum, p) => sum + p.displayCount, 0),
      totalClicks: proofs.reduce((sum, p) => sum + p.clickCount, 0),
      averageCtr: 0,
      proofTypeBreakdown: {},
      platformBreakdown: {},
      topPerformingProofs: [],
    };

    // Calculate average CTR
    const proofsWithDisplays = proofs.filter(p => p.displayCount > 0);
    if (proofsWithDisplays.length > 0) {
      analytics.averageCtr = proofsWithDisplays.reduce(
        (sum, p) => sum + p.clickThroughRate, 0
      ) / proofsWithDisplays.length;
    }

    // Proof type breakdown
    for (const proof of proofs) {
      analytics.proofTypeBreakdown[proof.proofType] = 
        (analytics.proofTypeBreakdown[proof.proofType] || 0) + 1;
    }

    // Platform breakdown
    for (const proof of proofs) {
      if (proof.platform) {
        analytics.platformBreakdown[proof.platform] = 
          (analytics.platformBreakdown[proof.platform] || 0) + 1;
      }
    }

    // Top performing proofs
    analytics.topPerformingProofs = proofs
      .filter(p => p.displayCount > 0)
      .sort((a, b) => b.clickThroughRate - a.clickThroughRate)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        content: p.content.substring(0, 100),
        proofType: p.proofType,
        displayCount: p.displayCount,
        clickCount: p.clickCount,
        clickThroughRate: p.clickThroughRate,
      }));

    return analytics;
  }

  async syncUserGeneratedContent(eventId: string): Promise<void> {
    // Find UGC that can be converted to social proof
    const ugcContent = await this.ugcRepository.find({
      where: {
        eventId,
        status: ContentStatus.APPROVED,
      },
      take: 50,
    });

    for (const content of ugcContent) {
      // Check if we already have social proof for this UGC
      const existingProof = await this.proofRepository.findOne({
        where: {
          sourceUrl: content.originalUrl,
        },
      });

      if (!existingProof && content.originalUrl) {
        await this.createSocialProof({
          eventId: content.eventId,
          userId: content.userId,
          organizerId: content.organizerId,
          proofType: ProofType.USER_COUNT,
          content: content.description,
          authorName: content.authorName,
          authorUsername: content.authorUsername,
          authorAvatarUrl: content.authorAvatarUrl,
          platform: content.platform,
          sourceUrl: content.originalUrl,
          mediaUrls: content.mediaUrls.map(m => m.url),
          metadata: {
            fromUGC: true,
            ugcId: content.id,
            engagement: content.totalEngagement,
            qualityScore: content.qualityScore,
          },
        });
      }
    }

    this.logger.log(`Synced UGC to social proof for event: ${eventId}`);
  }

  private async calculateCredibilityScore(dto: CreateSocialProofDto): Promise<number> {
    let score = 50; // Base score

    // Platform credibility
    if (dto.platform) {
      const platformScores = {
        'instagram': 15,
        'facebook': 12,
        'twitter': 10,
        'linkedin': 18,
        'tiktok': 8,
        'youtube': 14,
      };
      score += platformScores[dto.platform.toLowerCase()] || 5;
    }

    // Author verification
    if (dto.metadata?.verified) {
      score += 20;
    }

    // Engagement metrics
    if (dto.metadata?.followerCount) {
      const followers = dto.metadata.followerCount;
      if (followers > 100000) score += 15;
      else if (followers > 10000) score += 10;
      else if (followers > 1000) score += 5;
    }

    // Content quality
    if (dto.mediaUrls && dto.mediaUrls.length > 0) {
      score += 10;
    }

    if (dto.content.length > 50) {
      score += 5;
    }

    // Rating for reviews/testimonials
    if (dto.rating && dto.rating >= 4) {
      score += 10;
    }

    // Friend connections for friend attendance
    if (dto.proofType === ProofType.FRIEND_ATTENDANCE && dto.friendsData) {
      score += Math.min(dto.friendsData.length * 2, 20);
    }

    return Math.min(score, 100);
  }
}

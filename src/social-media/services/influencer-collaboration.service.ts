import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { InfluencerCollaboration, CollaborationStatus, CollaborationType, InfluencerTier, CompensationType } from '../entities/influencer-collaboration.entity';
import { ConfigService } from '@nestjs/config';

export interface CreateInfluencerCollaborationDto {
  eventId?: string;
  influencerId: string;
  organizerId: string;
  campaignId?: string;
  title: string;
  description?: string;
  collaborationType: CollaborationType;
  tier: InfluencerTier;
  influencerProfile: any;
  deliverables: any[];
  compensation: any;
  startDate?: Date;
  endDate?: Date;
}

export interface UpdateCollaborationDto {
  title?: string;
  description?: string;
  deliverables?: any[];
  compensation?: any;
  startDate?: Date;
  endDate?: Date;
  contract?: any;
}

export interface CollaborationMessage {
  sender: 'organizer' | 'influencer';
  message: string;
  type: 'message' | 'proposal' | 'revision' | 'approval';
  attachments?: string[];
}

@Injectable()
export class InfluencerCollaborationService {
  private readonly logger = new Logger(InfluencerCollaborationService.name);

  constructor(
    @InjectRepository(InfluencerCollaboration)
    private readonly collaborationRepository: Repository<InfluencerCollaboration>,
    private readonly configService: ConfigService,
  ) {}

  async createCollaboration(dto: CreateInfluencerCollaborationDto): Promise<InfluencerCollaboration> {
    const collaboration = this.collaborationRepository.create({
      ...dto,
      status: CollaborationStatus.DRAFT,
      communication: [],
      performance: {
        reach: 0,
        impressions: 0,
        engagement: 0,
        clicks: 0,
        conversions: 0,
        mentions: 0,
        hashtags: {},
        sentiment: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        roi: 0,
        costPerEngagement: 0,
        brandLift: 0,
      },
    });

    const savedCollaboration = await this.collaborationRepository.save(collaboration);
    this.logger.log(`Created influencer collaboration: ${savedCollaboration.id}`);
    return savedCollaboration;
  }

  async findCollaborationById(id: string): Promise<InfluencerCollaboration> {
    const collaboration = await this.collaborationRepository.findOne({
      where: { id },
    });

    if (!collaboration) {
      throw new NotFoundException(`Influencer collaboration with ID ${id} not found`);
    }

    return collaboration;
  }

  async findCollaborationsByOrganizer(organizerId: string): Promise<InfluencerCollaboration[]> {
    return this.collaborationRepository.find({
      where: { organizerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findCollaborationsByInfluencer(influencerId: string): Promise<InfluencerCollaboration[]> {
    return this.collaborationRepository.find({
      where: { influencerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findCollaborationsByEvent(eventId: string): Promise<InfluencerCollaboration[]> {
    return this.collaborationRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateCollaboration(id: string, dto: UpdateCollaborationDto): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (collaboration.status === CollaborationStatus.COMPLETED) {
      throw new BadRequestException('Cannot update completed collaborations');
    }

    Object.assign(collaboration, dto);
    return this.collaborationRepository.save(collaboration);
  }

  async inviteInfluencer(id: string): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (collaboration.status !== CollaborationStatus.DRAFT) {
      throw new BadRequestException('Can only invite from draft status');
    }

    collaboration.status = CollaborationStatus.INVITED;
    collaboration.invitedAt = new Date();

    // Add invitation message to communication
    const invitationMessage: CollaborationMessage = {
      sender: 'organizer',
      message: `You have been invited to collaborate on: ${collaboration.title}`,
      type: 'message',
    };

    collaboration.communication = collaboration.communication || [];
    collaboration.communication.push({
      ...invitationMessage,
      timestamp: new Date(),
    });

    const savedCollaboration = await this.collaborationRepository.save(collaboration);
    this.logger.log(`Invited influencer for collaboration: ${id}`);
    return savedCollaboration;
  }

  async acceptCollaboration(id: string): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (collaboration.status !== CollaborationStatus.INVITED) {
      throw new BadRequestException('Can only accept invited collaborations');
    }

    collaboration.status = CollaborationStatus.ACCEPTED;
    collaboration.acceptedAt = new Date();

    // Add acceptance message
    const acceptanceMessage: CollaborationMessage = {
      sender: 'influencer',
      message: 'Collaboration accepted! Looking forward to working together.',
      type: 'message',
    };

    collaboration.communication.push({
      ...acceptanceMessage,
      timestamp: new Date(),
    });

    return this.collaborationRepository.save(collaboration);
  }

  async rejectCollaboration(id: string, reason?: string): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (![CollaborationStatus.INVITED, CollaborationStatus.NEGOTIATING].includes(collaboration.status)) {
      throw new BadRequestException('Cannot reject collaboration in current status');
    }

    collaboration.status = CollaborationStatus.REJECTED;

    // Add rejection message
    const rejectionMessage: CollaborationMessage = {
      sender: 'influencer',
      message: reason || 'Collaboration declined.',
      type: 'message',
    };

    collaboration.communication.push({
      ...rejectionMessage,
      timestamp: new Date(),
    });

    return this.collaborationRepository.save(collaboration);
  }

  async startCollaboration(id: string): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (collaboration.status !== CollaborationStatus.ACCEPTED) {
      throw new BadRequestException('Collaboration must be accepted before starting');
    }

    collaboration.status = CollaborationStatus.ACTIVE;
    if (!collaboration.startDate) {
      collaboration.startDate = new Date();
    }

    return this.collaborationRepository.save(collaboration);
  }

  async completeCollaboration(id: string): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (collaboration.status !== CollaborationStatus.ACTIVE) {
      throw new BadRequestException('Only active collaborations can be completed');
    }

    // Check if all deliverables are completed
    const incompleteDeliverables = collaboration.deliverables.filter(
      d => d.status !== 'completed'
    );

    if (incompleteDeliverables.length > 0) {
      throw new BadRequestException('All deliverables must be completed before finishing collaboration');
    }

    collaboration.status = CollaborationStatus.COMPLETED;
    collaboration.completedAt = new Date();

    return this.collaborationRepository.save(collaboration);
  }

  async addMessage(id: string, message: CollaborationMessage): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    collaboration.communication = collaboration.communication || [];
    collaboration.communication.push({
      ...message,
      timestamp: new Date(),
    });

    return this.collaborationRepository.save(collaboration);
  }

  async updateDeliverable(
    id: string,
    deliverableIndex: number,
    updates: {
      status?: string;
      postUrl?: string;
      submittedAt?: Date;
      approvedAt?: Date;
    },
  ): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (deliverableIndex >= collaboration.deliverables.length) {
      throw new BadRequestException('Invalid deliverable index');
    }

    Object.assign(collaboration.deliverables[deliverableIndex], updates);

    // If deliverable is being submitted, add timestamp
    if (updates.status === 'submitted' && !updates.submittedAt) {
      collaboration.deliverables[deliverableIndex].submittedAt = new Date();
    }

    // If deliverable is being approved, add timestamp
    if (updates.status === 'approved' && !updates.approvedAt) {
      collaboration.deliverables[deliverableIndex].approvedAt = new Date();
    }

    return this.collaborationRepository.save(collaboration);
  }

  async updatePerformanceMetrics(
    id: string,
    metrics: {
      reach?: number;
      impressions?: number;
      engagement?: number;
      clicks?: number;
      conversions?: number;
      mentions?: number;
      hashtags?: Record<string, number>;
      sentiment?: {
        positive: number;
        negative: number;
        neutral: number;
      };
    },
  ): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    collaboration.performance = {
      ...collaboration.performance,
      ...metrics,
    };

    // Calculate derived metrics
    const compensation = collaboration.compensation.amount || 0;
    if (metrics.engagement && compensation > 0) {
      collaboration.performance.costPerEngagement = compensation / metrics.engagement;
    }

    if (metrics.conversions && compensation > 0) {
      // Assuming average conversion value - this would be configurable
      const avgConversionValue = 50;
      const revenue = metrics.conversions * avgConversionValue;
      collaboration.performance.roi = ((revenue - compensation) / compensation) * 100;
    }

    return this.collaborationRepository.save(collaboration);
  }

  async rateCollaboration(
    id: string,
    rating: number,
    feedback?: string,
  ): Promise<InfluencerCollaboration> {
    const collaboration = await this.findCollaborationById(id);

    if (collaboration.status !== CollaborationStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed collaborations');
    }

    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    collaboration.satisfactionRating = rating;
    collaboration.feedback = feedback;

    return this.collaborationRepository.save(collaboration);
  }

  async getCollaborationAnalytics(
    organizerId: string,
    dateRange?: { start: Date; end: Date },
  ): Promise<any> {
    const whereClause: any = { organizerId };
    
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const collaborations = await this.collaborationRepository.find({
      where: whereClause,
    });

    const analytics = {
      totalCollaborations: collaborations.length,
      statusBreakdown: {},
      tierBreakdown: {},
      typeBreakdown: {},
      totalSpent: 0,
      averageRating: 0,
      totalReach: 0,
      totalEngagement: 0,
      averageROI: 0,
      topPerformingInfluencers: [],
      completionRate: 0,
    };

    // Status breakdown
    for (const collab of collaborations) {
      analytics.statusBreakdown[collab.status] = 
        (analytics.statusBreakdown[collab.status] || 0) + 1;
    }

    // Tier breakdown
    for (const collab of collaborations) {
      analytics.tierBreakdown[collab.tier] = 
        (analytics.tierBreakdown[collab.tier] || 0) + 1;
    }

    // Type breakdown
    for (const collab of collaborations) {
      analytics.typeBreakdown[collab.collaborationType] = 
        (analytics.typeBreakdown[collab.collaborationType] || 0) + 1;
    }

    // Financial metrics
    analytics.totalSpent = collaborations.reduce(
      (sum, c) => sum + (c.compensation.amount || 0), 0
    );

    // Performance metrics
    const completedCollabs = collaborations.filter(
      c => c.status === CollaborationStatus.COMPLETED
    );

    if (completedCollabs.length > 0) {
      analytics.completionRate = (completedCollabs.length / collaborations.length) * 100;

      const ratedCollabs = completedCollabs.filter(c => c.satisfactionRating);
      if (ratedCollabs.length > 0) {
        analytics.averageRating = ratedCollabs.reduce(
          (sum, c) => sum + c.satisfactionRating, 0
        ) / ratedCollabs.length;
      }

      analytics.totalReach = completedCollabs.reduce(
        (sum, c) => sum + (c.performance?.reach || 0), 0
      );

      analytics.totalEngagement = completedCollabs.reduce(
        (sum, c) => sum + (c.performance?.engagement || 0), 0
      );

      const collabsWithROI = completedCollabs.filter(c => c.performance?.roi);
      if (collabsWithROI.length > 0) {
        analytics.averageROI = collabsWithROI.reduce(
          (sum, c) => sum + c.performance.roi, 0
        ) / collabsWithROI.length;
      }
    }

    // Top performing influencers
    analytics.topPerformingInfluencers = completedCollabs
      .filter(c => c.performance?.engagement)
      .sort((a, b) => (b.performance?.engagement || 0) - (a.performance?.engagement || 0))
      .slice(0, 10)
      .map(c => ({
        influencerId: c.influencerId,
        influencerName: c.influencerProfile.name,
        tier: c.tier,
        engagement: c.performance?.engagement || 0,
        reach: c.performance?.reach || 0,
        roi: c.performance?.roi || 0,
        rating: c.satisfactionRating,
      }));

    return analytics;
  }

  async findInfluencersByTier(tier: InfluencerTier, limit: number = 50): Promise<any[]> {
    // This would integrate with an influencer database or external service
    // For now, returning mock data structure
    const mockInfluencers = [
      {
        id: 'inf_1',
        name: 'Sarah Johnson',
        username: '@sarahjohnson',
        tier: tier,
        platforms: [
          {
            platform: 'instagram',
            handle: '@sarahjohnson',
            followers: 150000,
            engagementRate: 3.2,
            verificationStatus: true,
          },
        ],
        demographics: {
          primaryAudience: {
            ageRange: '25-34',
            gender: 'female',
            locations: ['United States', 'Canada'],
            interests: ['lifestyle', 'fashion', 'events'],
          },
        },
        rates: {
          postRate: 2500,
          storyRate: 1000,
          videoRate: 4000,
        },
      },
    ];

    return mockInfluencers.slice(0, limit);
  }

  async searchInfluencers(criteria: {
    tier?: InfluencerTier;
    platforms?: string[];
    minFollowers?: number;
    maxFollowers?: number;
    interests?: string[];
    location?: string;
    minEngagementRate?: number;
    maxBudget?: number;
  }): Promise<any[]> {
    // This would integrate with influencer discovery platforms
    // For now, returning filtered mock data
    this.logger.log(`Searching influencers with criteria: ${JSON.stringify(criteria)}`);
    
    return this.findInfluencersByTier(criteria.tier || InfluencerTier.MICRO, 20);
  }

  async generateCollaborationContract(id: string): Promise<string> {
    const collaboration = await this.findCollaborationById(id);

    // This would integrate with a contract generation service
    const contractTemplate = `
INFLUENCER COLLABORATION AGREEMENT

Collaboration: ${collaboration.title}
Influencer: ${collaboration.influencerProfile.name}
Event: ${collaboration.eventId || 'N/A'}

DELIVERABLES:
${collaboration.deliverables.map((d, i) => 
  `${i + 1}. ${d.description} - Due: ${d.deadline}`
).join('\n')}

COMPENSATION:
Type: ${collaboration.compensation.type}
Amount: ${collaboration.compensation.amount} ${collaboration.compensation.currency || 'USD'}
Payment Terms: ${collaboration.compensation.paymentTerms.schedule}

TERMS:
- Collaboration Period: ${collaboration.startDate} to ${collaboration.endDate}
- Usage Rights: As specified in platform terms
- Content Approval: Required before posting
- Cancellation: As per standard terms

Generated on: ${new Date().toISOString()}
    `;

    return contractTemplate.trim();
  }
}

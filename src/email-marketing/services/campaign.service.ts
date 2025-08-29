import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EmailCampaign, CampaignStatus, CampaignType } from '../entities/email-campaign.entity';
import { CampaignSegment } from '../entities/campaign-segment.entity';
import { EmailTemplate } from '../entities/email-template.entity';
import { UserSegment } from '../entities/user-segment.entity';
import { EmailDelivery, DeliveryStatus } from '../entities/email-delivery.entity';
import { CreateCampaignDto } from '../dto/create-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(
    @InjectRepository(EmailCampaign)
    private campaignRepository: Repository<EmailCampaign>,
    @InjectRepository(CampaignSegment)
    private campaignSegmentRepository: Repository<CampaignSegment>,
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
    @InjectRepository(UserSegment)
    private userSegmentRepository: Repository<UserSegment>,
    @InjectRepository(EmailDelivery)
    private deliveryRepository: Repository<EmailDelivery>,
  ) {}

  async create(createCampaignDto: CreateCampaignDto): Promise<EmailCampaign> {
    // Validate template exists
    const template = await this.templateRepository.findOne({
      where: { id: createCampaignDto.templateId },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Generate unique slug
    const baseSlug = createCampaignDto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    while (await this.campaignRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const campaign = this.campaignRepository.create({
      name: createCampaignDto.name,
      description: createCampaignDto.description,
      campaignType: createCampaignDto.campaignType,
      templateId: createCampaignDto.templateId,
      subject: createCampaignDto.subject,
      preheaderText: createCampaignDto.preheaderText,
      senderName: createCampaignDto.senderName,
      senderEmail: createCampaignDto.senderEmail,
      replyToEmail: createCampaignDto.replyToEmail,
      scheduledAt: createCampaignDto.scheduledAt,
      personalizationData: createCampaignDto.personalizationData,
      trackingSettings: createCampaignDto.trackingSettings,
      tags: createCampaignDto.tags,
      createdBy: createCampaignDto.createdBy,
      abTestId: createCampaignDto.abTestId,
      slug,
      status: CampaignStatus.DRAFT,
    });

    const savedCampaign = await this.campaignRepository.save(campaign);

    // Create campaign segments if provided
    if (createCampaignDto.segments && createCampaignDto.segments.length > 0) {
      const segments = await Promise.all(
        createCampaignDto.segments.map(async (segmentDto) => {
          const segment = await this.userSegmentRepository.findOne({
            where: { id: segmentDto.segmentId },
          });
          if (!segment) {
            throw new NotFoundException(`Segment ${segmentDto.segmentId} not found`);
          }

          return this.campaignSegmentRepository.create({
            campaignId: savedCampaign.id,
            segmentId: segmentDto.segmentId,
            isIncluded: segmentDto.isIncluded,
            segmentSize: segment.userCount,
          });
        })
      );

      await this.campaignSegmentRepository.save(segments);
    }

    return this.findOne(savedCampaign.id);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    status?: CampaignStatus;
    campaignType?: CampaignType;
    createdBy?: string;
    search?: string;
    tags?: string[];
  } = {}): Promise<{
    campaigns: EmailCampaign[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      status,
      campaignType,
      createdBy,
      search,
      tags,
    } = options;

    const queryBuilder = this.campaignRepository
      .createQueryBuilder('campaign')
      .leftJoinAndSelect('campaign.template', 'template')
      .leftJoinAndSelect('campaign.creator', 'creator')
      .leftJoinAndSelect('campaign.segments', 'segments')
      .leftJoinAndSelect('segments.segment', 'segment');

    if (status) {
      queryBuilder.andWhere('campaign.status = :status', { status });
    }

    if (campaignType) {
      queryBuilder.andWhere('campaign.campaignType = :campaignType', { campaignType });
    }

    if (createdBy) {
      queryBuilder.andWhere('campaign.createdBy = :createdBy', { createdBy });
    }

    if (search) {
      queryBuilder.andWhere(
        '(campaign.name LIKE :search OR campaign.description LIKE :search OR campaign.subject LIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (tags && tags.length > 0) {
      queryBuilder.andWhere('campaign.tags && :tags', { tags });
    }

    queryBuilder.orderBy('campaign.createdAt', 'DESC');

    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [campaigns, total] = await queryBuilder.getManyAndCount();

    return { campaigns, total, page, limit };
  }

  async findOne(id: string): Promise<EmailCampaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
      relations: [
        'template',
        'creator',
        'segments',
        'segments.segment',
        'abTest',
        'deliveries',
      ],
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    // Validate status transition
    if (!this.isValidStatusTransition(campaign.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${campaign.status} to ${status}`
      );
    }

    campaign.status = status;

    if (status === CampaignStatus.SENT) {
      campaign.sentAt = new Date();
    }

    return this.campaignRepository.save(campaign);
  }

  async scheduleCampaign(id: string, scheduledAt: Date): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.DRAFT) {
      throw new BadRequestException('Only draft campaigns can be scheduled');
    }

    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    campaign.scheduledAt = scheduledAt;
    campaign.status = CampaignStatus.SCHEDULED;

    return this.campaignRepository.save(campaign);
  }

  async sendCampaign(id: string): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (![CampaignStatus.DRAFT, CampaignStatus.SCHEDULED].includes(campaign.status)) {
      throw new BadRequestException('Campaign cannot be sent in current status');
    }

    // Update campaign status
    campaign.status = CampaignStatus.SENDING;
    campaign.sentAt = new Date();
    await this.campaignRepository.save(campaign);

    // Get recipients from segments
    const recipients = await this.getCampaignRecipients(id);
    
    // Create delivery records
    const deliveries = recipients.map(recipient => 
      this.deliveryRepository.create({
        campaignId: id,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        status: DeliveryStatus.QUEUED,
        personalizedSubject: this.personalizeContent(campaign.subject, recipient),
        personalizedContent: campaign.personalizationData || {},
        trackingData: {
          campaignId: id,
          recipientId: recipient.id,
          trackingPixelUrl: this.generateTrackingPixelUrl(id, recipient.id),
        },
      })
    );

    await this.deliveryRepository.save(deliveries);

    // Update campaign metrics
    campaign.recipientCount = recipients.length;
    campaign.status = CampaignStatus.SENT;

    return this.campaignRepository.save(campaign);
  }

  async pauseCampaign(id: string): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.SENDING) {
      throw new BadRequestException('Only sending campaigns can be paused');
    }

    campaign.status = CampaignStatus.PAUSED;
    return this.campaignRepository.save(campaign);
  }

  async resumeCampaign(id: string): Promise<EmailCampaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException('Only paused campaigns can be resumed');
    }

    campaign.status = CampaignStatus.SENDING;
    return this.campaignRepository.save(campaign);
  }

  async getCampaignStats(id: string): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
    unsubscribeRate: number;
  }> {
    const deliveries = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .leftJoin('delivery.opens', 'opens')
      .leftJoin('delivery.clicks', 'clicks')
      .leftJoin('delivery.bounces', 'bounces')
      .where('delivery.campaignId = :campaignId', { campaignId: id })
      .select([
        'COUNT(delivery.id) as sent',
        'COUNT(CASE WHEN delivery.status = :delivered THEN 1 END) as delivered',
        'COUNT(CASE WHEN delivery.status = :bounced THEN 1 END) as bounced',
        'COUNT(DISTINCT opens.deliveryId) as opened',
        'COUNT(DISTINCT clicks.deliveryId) as clicked',
        'COUNT(CASE WHEN delivery.unsubscribedAt IS NOT NULL THEN 1 END) as unsubscribed',
      ])
      .setParameters({
        delivered: DeliveryStatus.DELIVERED,
        bounced: DeliveryStatus.BOUNCED,
      })
      .getRawOne();

    const sent = parseInt(deliveries.sent) || 0;
    const delivered = parseInt(deliveries.delivered) || 0;
    const bounced = parseInt(deliveries.bounced) || 0;
    const opened = parseInt(deliveries.opened) || 0;
    const clicked = parseInt(deliveries.clicked) || 0;
    const unsubscribed = parseInt(deliveries.unsubscribed) || 0;

    return {
      sent,
      delivered,
      bounced,
      opened,
      clicked,
      unsubscribed,
      openRate: delivered > 0 ? (opened / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicked / delivered) * 100 : 0,
      bounceRate: sent > 0 ? (bounced / sent) * 100 : 0,
      unsubscribeRate: delivered > 0 ? (unsubscribed / delivered) * 100 : 0,
    };
  }

  async duplicateCampaign(id: string, name: string): Promise<EmailCampaign> {
    const originalCampaign = await this.findOne(id);

    const duplicateData = {
      name,
      description: originalCampaign.description,
      campaignType: originalCampaign.campaignType,
      templateId: originalCampaign.templateId,
      subject: originalCampaign.subject,
      preheaderText: originalCampaign.preheaderText,
      senderName: originalCampaign.senderName,
      senderEmail: originalCampaign.senderEmail,
      replyToEmail: originalCampaign.replyToEmail,
      personalizationData: originalCampaign.personalizationData,
      trackingSettings: originalCampaign.trackingSettings,
      tags: originalCampaign.tags,
      createdBy: originalCampaign.createdBy,
      segments: originalCampaign.segments?.map(seg => ({
        segmentId: seg.segmentId,
        isIncluded: seg.isIncluded,
      })),
    };

    return this.create(duplicateData as any);
  }

  private async getCampaignRecipients(campaignId: string): Promise<any[]> {
    // This would integrate with your user management system
    // For now, returning a mock implementation
    const campaign = await this.findOne(campaignId);
    
    // Get all users from included segments, exclude users from excluded segments
    const includedSegmentIds = campaign.segments
      ?.filter(seg => seg.isIncluded)
      .map(seg => seg.segmentId) || [];
    
    const excludedSegmentIds = campaign.segments
      ?.filter(seg => !seg.isIncluded)
      .map(seg => seg.segmentId) || [];

    // Mock implementation - replace with actual user query
    return [
      { id: '1', email: 'user1@example.com', name: 'User 1' },
      { id: '2', email: 'user2@example.com', name: 'User 2' },
    ];
  }

  private personalizeContent(content: string, recipient: any): string {
    return content
      .replace(/{{name}}/g, recipient.name || 'Valued Customer')
      .replace(/{{email}}/g, recipient.email || '');
  }

  private generateTrackingPixelUrl(campaignId: string, recipientId: string): string {
    return `https://your-domain.com/track/pixel/${campaignId}/${recipientId}`;
  }

  private isValidStatusTransition(currentStatus: CampaignStatus, newStatus: CampaignStatus): boolean {
    const validTransitions: Record<CampaignStatus, CampaignStatus[]> = {
      [CampaignStatus.DRAFT]: [CampaignStatus.SCHEDULED, CampaignStatus.SENDING, CampaignStatus.ARCHIVED],
      [CampaignStatus.SCHEDULED]: [CampaignStatus.DRAFT, CampaignStatus.SENDING, CampaignStatus.ARCHIVED],
      [CampaignStatus.SENDING]: [CampaignStatus.SENT, CampaignStatus.PAUSED, CampaignStatus.FAILED],
      [CampaignStatus.PAUSED]: [CampaignStatus.SENDING, CampaignStatus.ARCHIVED],
      [CampaignStatus.SENT]: [CampaignStatus.ARCHIVED],
      [CampaignStatus.FAILED]: [CampaignStatus.DRAFT, CampaignStatus.ARCHIVED],
      [CampaignStatus.ARCHIVED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  async remove(id: string): Promise<void> {
    const campaign = await this.findOne(id);
    
    if ([CampaignStatus.SENDING, CampaignStatus.SENT].includes(campaign.status)) {
      throw new BadRequestException('Cannot delete sent or sending campaigns');
    }

    campaign.status = CampaignStatus.ARCHIVED;
    await this.campaignRepository.save(campaign);
  }
}

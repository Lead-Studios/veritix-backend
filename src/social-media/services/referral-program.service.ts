import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { ReferralProgram, ProgramStatus } from '../entities/referral-program.entity';
import { ReferralCode, CodeStatus } from '../entities/referral-code.entity';
import { ReferralTracking, TrackingStatus, ConversionType } from '../entities/referral-tracking.entity';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

export interface CreateReferralProgramDto {
  eventId?: string;
  organizerId: string;
  name: string;
  description?: string;
  programType: string;
  rewardType: string;
  rewardValue: number;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
  eligibilityRules?: any;
  fraudPrevention?: any;
  socialSharing?: any;
}

export interface CreateReferralCodeDto {
  programId: string;
  userId: string;
  customCode?: string;
  usageLimit?: number;
  expiresAt?: Date;
}

export interface ReferralConversionDto {
  codeId: string;
  convertedUserId?: string;
  conversionType: ConversionType;
  conversionValue?: number;
  metadata?: any;
}

@Injectable()
export class ReferralProgramService {
  private readonly logger = new Logger(ReferralProgramService.name);

  constructor(
    @InjectRepository(ReferralProgram)
    private readonly programRepository: Repository<ReferralProgram>,
    @InjectRepository(ReferralCode)
    private readonly codeRepository: Repository<ReferralCode>,
    @InjectRepository(ReferralTracking)
    private readonly trackingRepository: Repository<ReferralTracking>,
    private readonly configService: ConfigService,
  ) {}

  async createProgram(dto: CreateReferralProgramDto): Promise<ReferralProgram> {
    const program = this.programRepository.create({
      ...dto,
      status: ProgramStatus.DRAFT,
      analytics: {
        totalCodes: 0,
        activeCodes: 0,
        totalClicks: 0,
        totalConversions: 0,
        totalRevenue: 0,
        conversionRate: 0,
        averageOrderValue: 0,
      },
    });

    const savedProgram = await this.programRepository.save(program);
    this.logger.log(`Created referral program: ${savedProgram.id}`);
    return savedProgram;
  }

  async findProgramById(id: string): Promise<ReferralProgram> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: ['codes'],
    });

    if (!program) {
      throw new NotFoundException(`Referral program with ID ${id} not found`);
    }

    return program;
  }

  async findProgramsByOrganizer(organizerId: string): Promise<ReferralProgram[]> {
    return this.programRepository.find({
      where: { organizerId },
      order: { createdAt: 'DESC' },
    });
  }

  async findProgramsByEvent(eventId: string): Promise<ReferralProgram[]> {
    return this.programRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateProgramStatus(id: string, status: ProgramStatus): Promise<ReferralProgram> {
    const program = await this.findProgramById(id);
    program.status = status;

    if (status === ProgramStatus.ACTIVE && !program.startDate) {
      program.startDate = new Date();
    }

    if (status === ProgramStatus.ENDED && !program.endDate) {
      program.endDate = new Date();
    }

    return this.programRepository.save(program);
  }

  async generateReferralCode(dto: CreateReferralCodeDto): Promise<ReferralCode> {
    const program = await this.findProgramById(dto.programId);

    if (program.status !== ProgramStatus.ACTIVE) {
      throw new BadRequestException('Cannot generate codes for inactive programs');
    }

    // Check if user already has a code for this program
    const existingCode = await this.codeRepository.findOne({
      where: {
        programId: dto.programId,
        userId: dto.userId,
        status: CodeStatus.ACTIVE,
      },
    });

    if (existingCode) {
      return existingCode;
    }

    const code = dto.customCode || this.generateUniqueCode();

    // Ensure code is unique
    const codeExists = await this.codeRepository.findOne({
      where: { code },
    });

    if (codeExists) {
      throw new BadRequestException('Referral code already exists');
    }

    const referralCode = this.codeRepository.create({
      ...dto,
      code,
      status: CodeStatus.ACTIVE,
      analytics: {
        totalClicks: 0,
        uniqueClicks: 0,
        conversions: 0,
        revenue: 0,
        conversionRate: 0,
        lastClickAt: null,
        topSources: {},
        deviceBreakdown: {},
        locationBreakdown: {},
      },
      socialSharing: {
        totalShares: 0,
        platformBreakdown: {},
        lastSharedAt: null,
      },
    });

    const savedCode = await this.codeRepository.save(referralCode);

    // Update program analytics
    await this.updateProgramAnalytics(dto.programId);

    this.logger.log(`Generated referral code: ${savedCode.code} for user: ${dto.userId}`);
    return savedCode;
  }

  async findCodeByCode(code: string): Promise<ReferralCode> {
    const referralCode = await this.codeRepository.findOne({
      where: { code },
      relations: ['program'],
    });

    if (!referralCode) {
      throw new NotFoundException(`Referral code ${code} not found`);
    }

    return referralCode;
  }

  async findCodesByUser(userId: string): Promise<ReferralCode[]> {
    return this.codeRepository.find({
      where: { userId },
      relations: ['program'],
      order: { createdAt: 'DESC' },
    });
  }

  async trackReferralClick(
    code: string,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    },
  ): Promise<ReferralTracking> {
    const referralCode = await this.findCodeByCode(code);

    // Check if code is still valid
    if (referralCode.status !== CodeStatus.ACTIVE) {
      throw new BadRequestException('Referral code is not active');
    }

    if (referralCode.expiresAt && new Date() > referralCode.expiresAt) {
      throw new BadRequestException('Referral code has expired');
    }

    if (referralCode.usageLimit && referralCode.usedCount >= referralCode.usageLimit) {
      throw new BadRequestException('Referral code usage limit exceeded');
    }

    // Create tracking record
    const tracking = this.trackingRepository.create({
      codeId: referralCode.id,
      programId: referralCode.programId,
      status: TrackingStatus.CLICKED,
      deviceInfo: {
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
      sourceInfo: {
        referrer: metadata.referrer,
        utmSource: metadata.utmSource,
        utmMedium: metadata.utmMedium,
        utmCampaign: metadata.utmCampaign,
      },
      fraudDetection: {
        riskScore: await this.calculateRiskScore(metadata),
        flags: [],
        isBlocked: false,
      },
    });

    const savedTracking = await this.trackingRepository.save(tracking);

    // Update code analytics
    await this.updateCodeAnalytics(referralCode.id, 'click', metadata);

    this.logger.log(`Tracked referral click for code: ${code}`);
    return savedTracking;
  }

  async processReferralConversion(dto: ReferralConversionDto): Promise<ReferralTracking> {
    const referralCode = await this.codeRepository.findOne({
      where: { id: dto.codeId },
      relations: ['program'],
    });

    if (!referralCode) {
      throw new NotFoundException(`Referral code with ID ${dto.codeId} not found`);
    }

    // Find the most recent click tracking for this code
    const clickTracking = await this.trackingRepository.findOne({
      where: {
        codeId: dto.codeId,
        status: TrackingStatus.CLICKED,
      },
      order: { createdAt: 'DESC' },
    });

    if (!clickTracking) {
      throw new BadRequestException('No click tracking found for this referral code');
    }

    // Update tracking with conversion
    clickTracking.status = TrackingStatus.CONVERTED;
    clickTracking.convertedUserId = dto.convertedUserId;
    clickTracking.conversionType = dto.conversionType;
    clickTracking.conversionValue = dto.conversionValue || 0;
    clickTracking.conversionData = {
      ...dto.metadata,
      convertedAt: new Date(),
    };

    const savedTracking = await this.trackingRepository.save(clickTracking);

    // Update code analytics
    await this.updateCodeAnalytics(dto.codeId, 'conversion', {
      conversionValue: dto.conversionValue,
      conversionType: dto.conversionType,
    });

    // Update program analytics
    await this.updateProgramAnalytics(referralCode.programId);

    // Calculate and award rewards
    await this.processRewards(referralCode, dto.conversionValue || 0);

    this.logger.log(`Processed referral conversion for code: ${referralCode.code}`);
    return savedTracking;
  }

  async getReferralAnalytics(codeId: string, dateRange?: { start: Date; end: Date }) {
    const code = await this.codeRepository.findOne({
      where: { id: codeId },
      relations: ['program'],
    });

    if (!code) {
      throw new NotFoundException(`Referral code with ID ${codeId} not found`);
    }

    const whereClause: any = { codeId };
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const trackingRecords = await this.trackingRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });

    const analytics = {
      totalClicks: trackingRecords.filter(t => t.status === TrackingStatus.CLICKED).length,
      totalConversions: trackingRecords.filter(t => t.status === TrackingStatus.CONVERTED).length,
      conversionRate: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      topSources: {},
      deviceBreakdown: {},
      timeSeriesData: [],
    };

    if (analytics.totalClicks > 0) {
      analytics.conversionRate = (analytics.totalConversions / analytics.totalClicks) * 100;
    }

    const conversions = trackingRecords.filter(t => t.status === TrackingStatus.CONVERTED);
    analytics.totalRevenue = conversions.reduce((sum, t) => sum + (t.conversionValue || 0), 0);

    if (analytics.totalConversions > 0) {
      analytics.averageOrderValue = analytics.totalRevenue / analytics.totalConversions;
    }

    return analytics;
  }

  async getProgramAnalytics(programId: string, dateRange?: { start: Date; end: Date }) {
    const program = await this.findProgramById(programId);

    const whereClause: any = { programId };
    if (dateRange) {
      whereClause.createdAt = Between(dateRange.start, dateRange.end);
    }

    const trackingRecords = await this.trackingRepository.find({
      where: whereClause,
    });

    const codes = await this.codeRepository.find({
      where: { programId },
    });

    return {
      program: {
        id: program.id,
        name: program.name,
        status: program.status,
        totalCodes: codes.length,
        activeCodes: codes.filter(c => c.status === CodeStatus.ACTIVE).length,
      },
      performance: {
        totalClicks: trackingRecords.filter(t => t.status === TrackingStatus.CLICKED).length,
        totalConversions: trackingRecords.filter(t => t.status === TrackingStatus.CONVERTED).length,
        totalRevenue: trackingRecords
          .filter(t => t.status === TrackingStatus.CONVERTED)
          .reduce((sum, t) => sum + (t.conversionValue || 0), 0),
      },
      topPerformingCodes: await this.getTopPerformingCodes(programId, 10),
    };
  }

  private generateUniqueCode(): string {
    const prefix = this.configService.get('REFERRAL_CODE_PREFIX', 'REF');
    const randomPart = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}${randomPart}`;
  }

  private async calculateRiskScore(metadata: any): Promise<number> {
    let riskScore = 0;

    // Check for suspicious patterns
    if (!metadata.userAgent) riskScore += 20;
    if (!metadata.referrer) riskScore += 10;
    
    // Check for bot-like behavior
    if (metadata.userAgent && metadata.userAgent.toLowerCase().includes('bot')) {
      riskScore += 50;
    }

    // Check for repeated IP addresses (simplified)
    if (metadata.ipAddress) {
      const recentClicks = await this.trackingRepository.count({
        where: {
          createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // Last 24 hours
        },
      });

      if (recentClicks > 10) riskScore += 30;
    }

    return Math.min(riskScore, 100);
  }

  private async updateCodeAnalytics(codeId: string, eventType: 'click' | 'conversion', metadata: any) {
    const code = await this.codeRepository.findOne({ where: { id: codeId } });
    if (!code) return;

    const analytics = code.analytics || {};

    if (eventType === 'click') {
      analytics.totalClicks = (analytics.totalClicks || 0) + 1;
      analytics.lastClickAt = new Date();

      // Update source breakdown
      if (metadata.utmSource) {
        analytics.topSources = analytics.topSources || {};
        analytics.topSources[metadata.utmSource] = (analytics.topSources[metadata.utmSource] || 0) + 1;
      }
    } else if (eventType === 'conversion') {
      analytics.conversions = (analytics.conversions || 0) + 1;
      analytics.revenue = (analytics.revenue || 0) + (metadata.conversionValue || 0);
      
      if (analytics.totalClicks > 0) {
        analytics.conversionRate = (analytics.conversions / analytics.totalClicks) * 100;
      }
    }

    code.analytics = analytics;
    await this.codeRepository.save(code);
  }

  private async updateProgramAnalytics(programId: string) {
    const program = await this.programRepository.findOne({ where: { id: programId } });
    if (!program) return;

    const codes = await this.codeRepository.find({ where: { programId } });
    const trackingRecords = await this.trackingRepository.find({ where: { programId } });

    const analytics = {
      totalCodes: codes.length,
      activeCodes: codes.filter(c => c.status === CodeStatus.ACTIVE).length,
      totalClicks: trackingRecords.filter(t => t.status === TrackingStatus.CLICKED).length,
      totalConversions: trackingRecords.filter(t => t.status === TrackingStatus.CONVERTED).length,
      totalRevenue: trackingRecords
        .filter(t => t.status === TrackingStatus.CONVERTED)
        .reduce((sum, t) => sum + (t.conversionValue || 0), 0),
      conversionRate: 0,
      averageOrderValue: 0,
    };

    if (analytics.totalClicks > 0) {
      analytics.conversionRate = (analytics.totalConversions / analytics.totalClicks) * 100;
    }

    if (analytics.totalConversions > 0) {
      analytics.averageOrderValue = analytics.totalRevenue / analytics.totalConversions;
    }

    program.analytics = analytics;
    await this.programRepository.save(program);
  }

  private async processRewards(code: ReferralCode, conversionValue: number) {
    const program = code.program;
    if (!program) return;

    // Calculate reward based on program settings
    let rewardAmount = 0;
    
    if (program.rewardType === 'fixed') {
      rewardAmount = program.rewardValue;
    } else if (program.rewardType === 'percentage') {
      rewardAmount = (conversionValue * program.rewardValue) / 100;
    }

    // Update code with reward information
    code.totalRewards = (code.totalRewards || 0) + rewardAmount;
    code.totalRevenue = (code.totalRevenue || 0) + conversionValue;
    
    await this.codeRepository.save(code);

    this.logger.log(`Processed reward of ${rewardAmount} for referral code: ${code.code}`);
  }

  private async getTopPerformingCodes(programId: string, limit: number = 10) {
    return this.codeRepository.find({
      where: { programId },
      order: { totalRevenue: 'DESC' },
      take: limit,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { FraudCase, FraudStatus, FraudType } from '../entities/fraud-case.entity';
import { BehavioralPattern } from '../entities/behavioral-pattern.entity';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity';

export enum AccountFlag {
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  VELOCITY_VIOLATION = 'velocity_violation',
  DEVICE_RISK = 'device_risk',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
  EXTERNAL_THREAT = 'external_threat',
  PAYMENT_FRAUD = 'payment_fraud',
  IDENTITY_THEFT = 'identity_theft',
  ACCOUNT_TAKEOVER = 'account_takeover',
}

export enum ReviewPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AccountFlagData {
  userId: string;
  flag: AccountFlag;
  priority: ReviewPriority;
  reason: string;
  evidence: Record<string, any>;
  autoResolve: boolean;
  expiresAt?: Date;
}

export interface ReviewCase {
  id: string;
  userId: string;
  flags: AccountFlag[];
  priority: ReviewPriority;
  status: 'pending' | 'in_review' | 'resolved' | 'escalated';
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  evidence: Record<string, any>;
  timeline: Array<{
    timestamp: Date;
    action: string;
    actor: string;
    details: string;
  }>;
}

@Injectable()
export class AccountFlaggingService {
  private readonly logger = new Logger(AccountFlaggingService.name);

  constructor(
    @InjectRepository(FraudCase)
    private fraudCaseRepository: Repository<FraudCase>,
    @InjectRepository(BehavioralPattern)
    private behavioralPatternRepository: Repository<BehavioralPattern>,
    @InjectRepository(DeviceFingerprint)
    private deviceFingerprintRepository: Repository<DeviceFingerprint>,
  ) {}

  async flagAccount(flagData: AccountFlagData): Promise<string> {
    try {
      this.logger.log(`Flagging account ${flagData.userId} for ${flagData.flag}`);

      // Check if similar flag already exists
      const existingCase = await this.findExistingCase(flagData.userId, flagData.flag);
      
      if (existingCase && existingCase.status !== FraudStatus.RESOLVED) {
        // Update existing case
        return await this.updateExistingCase(existingCase, flagData);
      }

      // Create new fraud case
      const fraudCase = await this.createFraudCase(flagData);
      
      // Trigger automated actions if applicable
      await this.triggerAutomatedActions(fraudCase, flagData);
      
      // Notify review team if high priority
      if (flagData.priority === ReviewPriority.HIGH || flagData.priority === ReviewPriority.CRITICAL) {
        await this.notifyReviewTeam(fraudCase);
      }

      return fraudCase.id;
    } catch (error) {
      this.logger.error(`Error flagging account: ${error.message}`, error.stack);
      throw error;
    }
  }

  async performAutomatedReview(userId: string): Promise<{
    riskScore: number;
    flags: AccountFlag[];
    recommendations: string[];
    requiresManualReview: boolean;
  }> {
    try {
      this.logger.log(`Performing automated review for user: ${userId}`);

      const [
        fraudHistory,
        behavioralPatterns,
        deviceRisks,
        velocityAnalysis,
      ] = await Promise.all([
        this.analyzeFraudHistory(userId),
        this.analyzeBehavioralPatterns(userId),
        this.analyzeDeviceRisks(userId),
        this.analyzeVelocityPatterns(userId),
      ]);

      const flags = this.determineFlags({
        fraudHistory,
        behavioralPatterns,
        deviceRisks,
        velocityAnalysis,
      });

      const riskScore = this.calculateAccountRiskScore({
        fraudHistory,
        behavioralPatterns,
        deviceRisks,
        velocityAnalysis,
        flags,
      });

      const recommendations = this.generateRecommendations(riskScore, flags);
      const requiresManualReview = this.shouldRequireManualReview(riskScore, flags);

      return {
        riskScore,
        flags,
        recommendations,
        requiresManualReview,
      };
    } catch (error) {
      this.logger.error(`Error in automated review: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getReviewQueue(priority?: ReviewPriority, assignedTo?: string): Promise<ReviewCase[]> {
    try {
      let query = this.fraudCaseRepository
        .createQueryBuilder('fraud')
        .where('fraud.status IN (:...statuses)', { 
          statuses: [FraudStatus.DETECTED, FraudStatus.UNDER_INVESTIGATION] 
        })
        .orderBy('fraud.createdAt', 'DESC');

      if (priority) {
        query = query.andWhere('fraud.investigation.priority = :priority', { priority });
      }

      if (assignedTo) {
        query = query.andWhere('fraud.investigation.assignedTo = :assignedTo', { assignedTo });
      }

      const cases = await query.getMany();

      return cases.map(fraudCase => ({
        id: fraudCase.id,
        userId: fraudCase.userId,
        flags: this.extractFlags(fraudCase),
        priority: fraudCase.investigation?.priority as ReviewPriority || ReviewPriority.MEDIUM,
        status: this.mapFraudStatusToReviewStatus(fraudCase.status),
        assignedTo: fraudCase.investigation?.assignedTo,
        createdAt: fraudCase.createdAt,
        resolvedAt: fraudCase.resolvedAt,
        resolution: fraudCase.resolution?.action,
        evidence: fraudCase.evidence,
        timeline: fraudCase.investigation?.timeline || [],
      }));
    } catch (error) {
      this.logger.error(`Error getting review queue: ${error.message}`, error.stack);
      throw error;
    }
  }

  async assignReviewer(caseId: string, reviewerId: string): Promise<void> {
    try {
      const fraudCase = await this.fraudCaseRepository.findOne({
        where: { id: caseId },
      });

      if (!fraudCase) {
        throw new Error(`Fraud case not found: ${caseId}`);
      }

      fraudCase.investigation.assignedTo = reviewerId;
      fraudCase.investigation.timeline.push({
        timestamp: new Date(),
        action: 'assigned_reviewer',
        actor: 'system',
        details: `Case assigned to reviewer: ${reviewerId}`,
      });

      if (fraudCase.status === FraudStatus.DETECTED) {
        fraudCase.status = FraudStatus.UNDER_INVESTIGATION;
      }

      await this.fraudCaseRepository.save(fraudCase);
    } catch (error) {
      this.logger.error(`Error assigning reviewer: ${error.message}`, error.stack);
      throw error;
    }
  }

  async resolveCase(
    caseId: string,
    resolution: {
      action: 'dismiss' | 'confirm_fraud' | 'suspend_account' | 'require_verification';
      reason: string;
      reviewerId: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      const fraudCase = await this.fraudCaseRepository.findOne({
        where: { id: caseId },
      });

      if (!fraudCase) {
        throw new Error(`Fraud case not found: ${caseId}`);
      }

      fraudCase.status = FraudStatus.RESOLVED;
      fraudCase.resolvedAt = new Date();
      fraudCase.resolution = {
        action: resolution.action,
        reason: resolution.reason,
        resolvedBy: resolution.reviewerId,
        resolvedAt: new Date(),
        notes: resolution.notes,
      };

      fraudCase.investigation.timeline.push({
        timestamp: new Date(),
        action: 'case_resolved',
        actor: resolution.reviewerId,
        details: `Case resolved: ${resolution.action} - ${resolution.reason}`,
      });

      await this.fraudCaseRepository.save(fraudCase);

      // Apply resolution actions
      await this.applyResolutionActions(fraudCase, resolution);
    } catch (error) {
      this.logger.error(`Error resolving case: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async findExistingCase(userId: string, flag: AccountFlag): Promise<FraudCase | null> {
    return await this.fraudCaseRepository.findOne({
      where: {
        userId,
        fraudType: this.mapFlagToFraudType(flag),
        status: FraudStatus.DETECTED,
      },
      order: { createdAt: 'DESC' },
    });
  }

  private async updateExistingCase(existingCase: FraudCase, flagData: AccountFlagData): Promise<string> {
    // Add new evidence to existing case
    existingCase.evidence = {
      ...existingCase.evidence,
      ...flagData.evidence,
      updatedFlags: [...(existingCase.evidence.updatedFlags || []), flagData.flag],
    };

    existingCase.investigation.timeline.push({
      timestamp: new Date(),
      action: 'flag_updated',
      actor: 'system',
      details: `Additional flag added: ${flagData.flag} - ${flagData.reason}`,
    });

    // Update priority if higher
    const currentPriority = existingCase.investigation.priority;
    if (this.isPriorityHigher(flagData.priority, currentPriority)) {
      existingCase.investigation.priority = flagData.priority;
    }

    await this.fraudCaseRepository.save(existingCase);
    return existingCase.id;
  }

  private async createFraudCase(flagData: AccountFlagData): Promise<FraudCase> {
    const fraudCase = this.fraudCaseRepository.create({
      userId: flagData.userId,
      fraudType: this.mapFlagToFraudType(flagData.flag),
      status: FraudStatus.DETECTED,
      riskScore: this.calculateFlagRiskScore(flagData.flag),
      description: `Account flagged: ${flagData.reason}`,
      evidence: {
        flag: flagData.flag,
        ...flagData.evidence,
      },
      detectedAt: new Date(),
      investigation: {
        assignedTo: null,
        priority: flagData.priority,
        notes: [],
        evidence: [],
        timeline: [{
          timestamp: new Date(),
          action: 'account_flagged',
          actor: 'system',
          details: `Account flagged for ${flagData.flag}: ${flagData.reason}`,
        }],
      },
      isActive: true,
    });

    return await this.fraudCaseRepository.save(fraudCase);
  }

  private async triggerAutomatedActions(fraudCase: FraudCase, flagData: AccountFlagData): Promise<void> {
    if (!flagData.autoResolve) return;

    // Automated actions based on flag type
    switch (flagData.flag) {
      case AccountFlag.VELOCITY_VIOLATION:
        await this.applyVelocityLimits(fraudCase.userId);
        break;
      case AccountFlag.DEVICE_RISK:
        await this.blockSuspiciousDevices(fraudCase.userId);
        break;
      case AccountFlag.EXTERNAL_THREAT:
        await this.enhanceSecurityMeasures(fraudCase.userId);
        break;
    }

    fraudCase.investigation.timeline.push({
      timestamp: new Date(),
      action: 'automated_action_triggered',
      actor: 'system',
      details: `Automated actions applied for ${flagData.flag}`,
    });

    await this.fraudCaseRepository.save(fraudCase);
  }

  private async analyzeFraudHistory(userId: string): Promise<any> {
    const fraudCases = await this.fraudCaseRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const confirmedFraud = fraudCases.filter(c => 
      c.resolution?.action === 'confirm_fraud'
    ).length;

    const totalCases = fraudCases.length;
    const recentCases = fraudCases.filter(c => 
      c.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    return {
      totalCases,
      confirmedFraud,
      recentCases,
      fraudRate: totalCases > 0 ? confirmedFraud / totalCases : 0,
      riskScore: Math.min(100, confirmedFraud * 25 + recentCases * 10),
    };
  }

  private async analyzeBehavioralPatterns(userId: string): Promise<any> {
    const pattern = await this.behavioralPatternRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!pattern) {
      return { riskScore: 30, anomalies: [], patterns: [] };
    }

    const recentAnomalies = pattern.anomalyHistory.filter(a =>
      new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const highSeverityAnomalies = recentAnomalies.filter(a =>
      a.severity === 'high' || a.severity === 'critical'
    );

    return {
      riskScore: Math.min(100, highSeverityAnomalies.length * 20 + recentAnomalies.length * 5),
      anomalies: recentAnomalies,
      patterns: pattern.mlFeatures,
      confidenceScore: pattern.confidenceScore,
    };
  }

  private async analyzeDeviceRisks(userId: string): Promise<any> {
    const devices = await this.deviceFingerprintRepository.find({
      where: { userId },
      order: { lastSeenAt: 'DESC' },
    });

    const highRiskDevices = devices.filter(d => d.riskScore > 70);
    const blockedDevices = devices.filter(d => d.status === 'blocked');
    const newDevices = devices.filter(d => d.isNewDevice);

    const avgRiskScore = devices.length > 0 
      ? devices.reduce((sum, d) => sum + d.riskScore, 0) / devices.length 
      : 50;

    return {
      totalDevices: devices.length,
      highRiskDevices: highRiskDevices.length,
      blockedDevices: blockedDevices.length,
      newDevices: newDevices.length,
      avgRiskScore,
      riskScore: Math.min(100, highRiskDevices.length * 30 + blockedDevices.length * 40),
    };
  }

  private async analyzeVelocityPatterns(userId: string): Promise<any> {
    // Mock velocity analysis - in production, query actual transaction data
    const mockData = {
      transactionsLast24h: Math.floor(Math.random() * 20),
      amountLast24h: Math.floor(Math.random() * 10000),
      uniqueDevicesLast24h: Math.floor(Math.random() * 5),
      uniqueLocationsLast24h: Math.floor(Math.random() * 3),
    };

    const velocityScore = 
      (mockData.transactionsLast24h > 10 ? 25 : 0) +
      (mockData.amountLast24h > 5000 ? 30 : 0) +
      (mockData.uniqueDevicesLast24h > 3 ? 20 : 0) +
      (mockData.uniqueLocationsLast24h > 2 ? 15 : 0);

    return {
      ...mockData,
      riskScore: velocityScore,
      violations: {
        transactionCount: mockData.transactionsLast24h > 10,
        amount: mockData.amountLast24h > 5000,
        devices: mockData.uniqueDevicesLast24h > 3,
        locations: mockData.uniqueLocationsLast24h > 2,
      },
    };
  }

  private determineFlags(analysisData: any): AccountFlag[] {
    const flags = [];

    if (analysisData.fraudHistory.fraudRate > 0.3) {
      flags.push(AccountFlag.SUSPICIOUS_ACTIVITY);
    }

    if (analysisData.velocityAnalysis.riskScore > 50) {
      flags.push(AccountFlag.VELOCITY_VIOLATION);
    }

    if (analysisData.deviceRisks.avgRiskScore > 70) {
      flags.push(AccountFlag.DEVICE_RISK);
    }

    if (analysisData.behavioralPatterns.riskScore > 60) {
      flags.push(AccountFlag.BEHAVIORAL_ANOMALY);
    }

    return flags;
  }

  private calculateAccountRiskScore(data: any): number {
    const weights = {
      fraudHistory: 0.4,
      behavioralPatterns: 0.25,
      deviceRisks: 0.2,
      velocityAnalysis: 0.15,
    };

    return (
      data.fraudHistory.riskScore * weights.fraudHistory +
      data.behavioralPatterns.riskScore * weights.behavioralPatterns +
      data.deviceRisks.riskScore * weights.deviceRisks +
      data.velocityAnalysis.riskScore * weights.velocityAnalysis
    );
  }

  private generateRecommendations(riskScore: number, flags: AccountFlag[]): string[] {
    const recommendations = [];

    if (riskScore > 80) {
      recommendations.push('Suspend account immediately');
      recommendations.push('Require identity verification');
    } else if (riskScore > 60) {
      recommendations.push('Apply enhanced monitoring');
      recommendations.push('Limit transaction amounts');
    } else if (riskScore > 40) {
      recommendations.push('Monitor account activity');
      recommendations.push('Consider step-up authentication');
    }

    flags.forEach(flag => {
      switch (flag) {
        case AccountFlag.VELOCITY_VIOLATION:
          recommendations.push('Apply velocity limits');
          break;
        case AccountFlag.DEVICE_RISK:
          recommendations.push('Block high-risk devices');
          break;
        case AccountFlag.BEHAVIORAL_ANOMALY:
          recommendations.push('Review behavioral patterns');
          break;
      }
    });

    return [...new Set(recommendations)];
  }

  private shouldRequireManualReview(riskScore: number, flags: AccountFlag[]): boolean {
    return riskScore > 70 || 
           flags.includes(AccountFlag.IDENTITY_THEFT) ||
           flags.includes(AccountFlag.ACCOUNT_TAKEOVER) ||
           flags.length > 2;
  }

  private mapFlagToFraudType(flag: AccountFlag): FraudType {
    const mapping = {
      [AccountFlag.SUSPICIOUS_ACTIVITY]: FraudType.ACCOUNT,
      [AccountFlag.VELOCITY_VIOLATION]: FraudType.TRANSACTION,
      [AccountFlag.DEVICE_RISK]: FraudType.DEVICE,
      [AccountFlag.BEHAVIORAL_ANOMALY]: FraudType.BEHAVIORAL,
      [AccountFlag.EXTERNAL_THREAT]: FraudType.EXTERNAL,
      [AccountFlag.PAYMENT_FRAUD]: FraudType.PAYMENT,
      [AccountFlag.IDENTITY_THEFT]: FraudType.IDENTITY,
      [AccountFlag.ACCOUNT_TAKEOVER]: FraudType.ACCOUNT,
    };

    return mapping[flag] || FraudType.OTHER;
  }

  private calculateFlagRiskScore(flag: AccountFlag): number {
    const scores = {
      [AccountFlag.SUSPICIOUS_ACTIVITY]: 60,
      [AccountFlag.VELOCITY_VIOLATION]: 70,
      [AccountFlag.DEVICE_RISK]: 65,
      [AccountFlag.BEHAVIORAL_ANOMALY]: 55,
      [AccountFlag.EXTERNAL_THREAT]: 80,
      [AccountFlag.PAYMENT_FRAUD]: 85,
      [AccountFlag.IDENTITY_THEFT]: 90,
      [AccountFlag.ACCOUNT_TAKEOVER]: 95,
    };

    return scores[flag] || 50;
  }

  private isPriorityHigher(newPriority: ReviewPriority, currentPriority: string): boolean {
    const priorityOrder = {
      [ReviewPriority.LOW]: 1,
      [ReviewPriority.MEDIUM]: 2,
      [ReviewPriority.HIGH]: 3,
      [ReviewPriority.CRITICAL]: 4,
    };

    return priorityOrder[newPriority] > (priorityOrder[currentPriority as ReviewPriority] || 0);
  }

  private extractFlags(fraudCase: FraudCase): AccountFlag[] {
    const flags = [];
    
    if (fraudCase.evidence.flag) {
      flags.push(fraudCase.evidence.flag);
    }
    
    if (fraudCase.evidence.updatedFlags) {
      flags.push(...fraudCase.evidence.updatedFlags);
    }

    return [...new Set(flags)];
  }

  private mapFraudStatusToReviewStatus(status: FraudStatus): 'pending' | 'in_review' | 'resolved' | 'escalated' {
    const mapping = {
      [FraudStatus.DETECTED]: 'pending',
      [FraudStatus.UNDER_INVESTIGATION]: 'in_review',
      [FraudStatus.RESOLVED]: 'resolved',
      [FraudStatus.CONFIRMED]: 'resolved',
      [FraudStatus.FALSE_POSITIVE]: 'resolved',
    };

    return mapping[status] || 'pending';
  }

  private async notifyReviewTeam(fraudCase: FraudCase): Promise<void> {
    // Mock notification - in production, send actual notifications
    this.logger.log(`High priority fraud case created: ${fraudCase.id}`);
  }

  private async applyVelocityLimits(userId: string): Promise<void> {
    // Mock implementation - apply velocity limits
    this.logger.log(`Applied velocity limits for user: ${userId}`);
  }

  private async blockSuspiciousDevices(userId: string): Promise<void> {
    // Mock implementation - block high-risk devices
    this.logger.log(`Blocked suspicious devices for user: ${userId}`);
  }

  private async enhanceSecurityMeasures(userId: string): Promise<void> {
    // Mock implementation - enhance security
    this.logger.log(`Enhanced security measures for user: ${userId}`);
  }

  private async applyResolutionActions(fraudCase: FraudCase, resolution: any): Promise<void> {
    switch (resolution.action) {
      case 'suspend_account':
        await this.suspendAccount(fraudCase.userId);
        break;
      case 'require_verification':
        await this.requireVerification(fraudCase.userId);
        break;
      case 'confirm_fraud':
        await this.markUserAsFraudulent(fraudCase.userId);
        break;
    }
  }

  private async suspendAccount(userId: string): Promise<void> {
    this.logger.log(`Account suspended: ${userId}`);
  }

  private async requireVerification(userId: string): Promise<void> {
    this.logger.log(`Verification required for user: ${userId}`);
  }

  private async markUserAsFraudulent(userId: string): Promise<void> {
    this.logger.log(`User marked as fraudulent: ${userId}`);
  }
}

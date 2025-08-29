import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { FraudCase, FraudStatus, FraudType } from '../entities/fraud-case.entity';
import { RiskScore, RiskScoreType } from '../entities/risk-score.entity';
import { BehavioralAnalysisService } from './behavioral-analysis.service';
import { DeviceFingerprintingService } from './device-fingerprinting.service';

export interface TransactionData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  merchantId?: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: {
    country: string;
    region: string;
    city: string;
    coordinates: [number, number];
  };
  deviceFingerprint?: any;
  sessionData?: any;
  metadata?: Record<string, any>;
}

export interface MonitoringResult {
  transactionId: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  decision: 'approve' | 'review' | 'decline' | 'challenge';
  reasons: string[];
  fraudCaseId?: string;
  recommendations: string[];
  processingTime: number;
}

export interface VelocityCheck {
  type: 'transaction_count' | 'amount_sum' | 'unique_cards' | 'unique_devices';
  timeWindow: '1h' | '24h' | '7d' | '30d';
  threshold: number;
  current: number;
  exceeded: boolean;
}

@Injectable()
export class TransactionMonitoringService {
  private readonly logger = new Logger(TransactionMonitoringService.name);

  constructor(
    @InjectRepository(FraudCase)
    private fraudCaseRepository: Repository<FraudCase>,
    @InjectRepository(RiskScore)
    private riskScoreRepository: Repository<RiskScore>,
    private behavioralAnalysisService: BehavioralAnalysisService,
    private deviceFingerprintingService: DeviceFingerprintingService,
  ) {}

  async monitorTransaction(transaction: TransactionData): Promise<MonitoringResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Monitoring transaction: ${transaction.id} for user: ${transaction.userId}`);

      // Parallel risk assessments
      const [
        velocityChecks,
        behavioralAnalysis,
        deviceRisk,
        ruleEngineResults,
        externalSignals,
      ] = await Promise.all([
        this.performVelocityChecks(transaction),
        this.analyzeBehavior(transaction),
        this.assessDeviceRisk(transaction),
        this.runRuleEngine(transaction),
        this.checkExternalSources(transaction),
      ]);

      // Calculate composite risk score
      const riskScore = this.calculateCompositeRiskScore({
        velocityChecks,
        behavioralAnalysis,
        deviceRisk,
        ruleEngineResults,
        externalSignals,
        transaction,
      });

      // Determine risk level and decision
      const riskLevel = this.determineRiskLevel(riskScore);
      const decision = this.makeDecision(riskScore, riskLevel, velocityChecks);

      // Generate reasons and recommendations
      const reasons = this.generateReasons({
        velocityChecks,
        behavioralAnalysis,
        deviceRisk,
        ruleEngineResults,
        riskScore,
      });

      const recommendations = this.generateRecommendations(riskLevel, decision, reasons);

      // Create fraud case if high risk
      let fraudCaseId: string | undefined;
      if (riskLevel === 'high' || riskLevel === 'critical') {
        fraudCaseId = await this.createFraudCase(transaction, riskScore, reasons);
      }

      // Store risk score record
      await this.storeRiskScore(transaction, riskScore, {
        velocityChecks,
        behavioralAnalysis,
        deviceRisk,
        ruleEngineResults,
        externalSignals,
      });

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Transaction ${transaction.id} processed: ${decision} (risk: ${riskScore}, time: ${processingTime}ms)`
      );

      return {
        transactionId: transaction.id,
        riskScore,
        riskLevel,
        decision,
        reasons,
        fraudCaseId,
        recommendations,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Error monitoring transaction ${transaction.id}: ${error.message}`, error.stack);
      
      // Fail safe - allow transaction but log for review
      return {
        transactionId: transaction.id,
        riskScore: 50,
        riskLevel: 'medium',
        decision: 'review',
        reasons: ['System error during fraud check'],
        recommendations: ['Manual review required due to system error'],
        processingTime: Date.now() - startTime,
      };
    }
  }

  private async performVelocityChecks(transaction: TransactionData): Promise<VelocityCheck[]> {
    const checks: VelocityCheck[] = [];
    const now = new Date();

    // Transaction count velocity (last 1 hour)
    const txCount1h = await this.getTransactionCount(
      transaction.userId,
      new Date(now.getTime() - 60 * 60 * 1000)
    );
    checks.push({
      type: 'transaction_count',
      timeWindow: '1h',
      threshold: 5,
      current: txCount1h,
      exceeded: txCount1h > 5,
    });

    // Transaction count velocity (last 24 hours)
    const txCount24h = await this.getTransactionCount(
      transaction.userId,
      new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    checks.push({
      type: 'transaction_count',
      timeWindow: '24h',
      threshold: 20,
      current: txCount24h,
      exceeded: txCount24h > 20,
    });

    // Amount velocity (last 24 hours)
    const amountSum24h = await this.getTransactionAmountSum(
      transaction.userId,
      new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    checks.push({
      type: 'amount_sum',
      timeWindow: '24h',
      threshold: 10000,
      current: amountSum24h,
      exceeded: amountSum24h > 10000,
    });

    // Unique payment methods (last 24 hours)
    const uniqueCards24h = await this.getUniquePaymentMethods(
      transaction.userId,
      new Date(now.getTime() - 24 * 60 * 60 * 1000)
    );
    checks.push({
      type: 'unique_cards',
      timeWindow: '24h',
      threshold: 3,
      current: uniqueCards24h,
      exceeded: uniqueCards24h > 3,
    });

    return checks;
  }

  private async analyzeBehavior(transaction: TransactionData): Promise<any> {
    try {
      const behaviorData = {
        userId: transaction.userId,
        sessionData: transaction.sessionData || {
          duration: 300,
          pageViews: 5,
          clickPattern: [1, 2, 3],
          scrollBehavior: {},
          mouseMovements: {},
        },
        transactionData: {
          amount: transaction.amount,
          frequency: 1,
          timeOfDay: transaction.timestamp.getHours(),
          dayOfWeek: transaction.timestamp.getDay(),
          paymentMethod: transaction.paymentMethod,
          location: transaction.location || {
            country: 'US',
            city: 'Unknown',
            coordinates: [0, 0] as [number, number],
          },
        },
        deviceData: {
          fingerprint: transaction.deviceFingerprint?.hash || 'unknown',
          type: 'desktop',
          newDevice: false,
        },
      };

      return await this.behavioralAnalysisService.analyzeBehavior(behaviorData);
    } catch (error) {
      this.logger.warn(`Behavioral analysis failed: ${error.message}`);
      return {
        riskScore: 30,
        anomalies: [],
        patterns: [],
        recommendations: [],
      };
    }
  }

  private async assessDeviceRisk(transaction: TransactionData): Promise<any> {
    try {
      if (!transaction.deviceFingerprint) {
        return {
          riskScore: 40,
          riskLevel: 'medium',
          riskFactors: [],
          recommendations: ['Device fingerprinting not available'],
          trustScore: 50,
        };
      }

      // Generate device fingerprint
      const device = await this.deviceFingerprintingService.generateFingerprint({
        userAgent: transaction.userAgent,
        ipAddress: transaction.ipAddress,
        userId: transaction.userId,
        ...transaction.deviceFingerprint,
      });

      return await this.deviceFingerprintingService.assessDeviceRisk(device.id);
    } catch (error) {
      this.logger.warn(`Device risk assessment failed: ${error.message}`);
      return {
        riskScore: 40,
        riskLevel: 'medium',
        riskFactors: [],
        recommendations: ['Device assessment unavailable'],
        trustScore: 50,
      };
    }
  }

  private async runRuleEngine(transaction: TransactionData): Promise<any> {
    const triggeredRules = [];

    // High amount rule
    if (transaction.amount > 5000) {
      triggeredRules.push({
        ruleId: 'high_amount',
        ruleName: 'High Transaction Amount',
        ruleType: 'threshold',
        triggered: true,
        score: 30,
        confidence: 90,
        parameters: { threshold: 5000, amount: transaction.amount },
        explanation: 'Transaction amount exceeds high-value threshold',
      });
    }

    // Round amount rule (potential testing)
    if (transaction.amount % 100 === 0 && transaction.amount >= 1000) {
      triggeredRules.push({
        ruleId: 'round_amount',
        ruleName: 'Round Amount Pattern',
        ruleType: 'pattern',
        triggered: true,
        score: 15,
        confidence: 60,
        parameters: { amount: transaction.amount },
        explanation: 'Transaction uses round amount which may indicate testing',
      });
    }

    // Off-hours transaction
    const hour = transaction.timestamp.getHours();
    if (hour >= 2 && hour <= 6) {
      triggeredRules.push({
        ruleId: 'off_hours',
        ruleName: 'Off-Hours Transaction',
        ruleType: 'temporal',
        triggered: true,
        score: 20,
        confidence: 70,
        parameters: { hour },
        explanation: 'Transaction occurred during unusual hours (2-6 AM)',
      });
    }

    // Weekend high-value transaction
    const dayOfWeek = transaction.timestamp.getDay();
    if ((dayOfWeek === 0 || dayOfWeek === 6) && transaction.amount > 2000) {
      triggeredRules.push({
        ruleId: 'weekend_high_value',
        ruleName: 'Weekend High-Value Transaction',
        ruleType: 'temporal',
        triggered: true,
        score: 25,
        confidence: 75,
        parameters: { dayOfWeek, amount: transaction.amount },
        explanation: 'High-value transaction on weekend',
      });
    }

    return {
      triggeredRules,
      totalScore: triggeredRules.reduce((sum, rule) => sum + rule.score, 0),
    };
  }

  private async checkExternalSources(transaction: TransactionData): Promise<any> {
    // Mock external fraud database checks
    const externalSignals = [];

    // Simulate IP reputation check
    const ipReputation = await this.checkIPReputation(transaction.ipAddress);
    if (ipReputation.risk > 0.7) {
      externalSignals.push({
        source: 'ip_reputation',
        signalType: 'reputation',
        value: ipReputation.risk,
        confidence: 85,
        timestamp: new Date(),
        impact: 25,
      });
    }

    // Simulate email reputation check
    const emailReputation = await this.checkEmailReputation(transaction.userId);
    if (emailReputation.risk > 0.6) {
      externalSignals.push({
        source: 'email_reputation',
        signalType: 'reputation',
        value: emailReputation.risk,
        confidence: 80,
        timestamp: new Date(),
        impact: 20,
      });
    }

    return externalSignals;
  }

  private calculateCompositeRiskScore(data: {
    velocityChecks: VelocityCheck[];
    behavioralAnalysis: any;
    deviceRisk: any;
    ruleEngineResults: any;
    externalSignals: any[];
    transaction: TransactionData;
  }): number {
    let score = 0;
    let totalWeight = 0;

    // Velocity checks (weight: 25%)
    const velocityScore = data.velocityChecks.reduce((sum, check) => {
      return sum + (check.exceeded ? 20 : 0);
    }, 0);
    score += velocityScore * 0.25;
    totalWeight += 0.25;

    // Behavioral analysis (weight: 30%)
    if (data.behavioralAnalysis.riskScore) {
      score += data.behavioralAnalysis.riskScore * 0.30;
      totalWeight += 0.30;
    }

    // Device risk (weight: 25%)
    if (data.deviceRisk.riskScore) {
      score += data.deviceRisk.riskScore * 0.25;
      totalWeight += 0.25;
    }

    // Rule engine (weight: 15%)
    const ruleScore = Math.min(100, data.ruleEngineResults.totalScore);
    score += ruleScore * 0.15;
    totalWeight += 0.15;

    // External signals (weight: 5%)
    const externalScore = data.externalSignals.reduce((sum, signal) => {
      return sum + signal.impact;
    }, 0);
    score += Math.min(100, externalScore) * 0.05;
    totalWeight += 0.05;

    return totalWeight > 0 ? score / totalWeight : 50;
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 85) return 'critical';
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  private makeDecision(
    riskScore: number,
    riskLevel: string,
    velocityChecks: VelocityCheck[]
  ): 'approve' | 'review' | 'decline' | 'challenge' {
    // Critical velocity violations
    const criticalVelocity = velocityChecks.some(
      check => check.exceeded && check.current > check.threshold * 2
    );

    if (criticalVelocity || riskLevel === 'critical') {
      return 'decline';
    }

    if (riskLevel === 'high') {
      return 'review';
    }

    if (riskLevel === 'medium' && riskScore > 50) {
      return 'challenge';
    }

    return 'approve';
  }

  private generateReasons(data: {
    velocityChecks: VelocityCheck[];
    behavioralAnalysis: any;
    deviceRisk: any;
    ruleEngineResults: any;
    riskScore: number;
  }): string[] {
    const reasons = [];

    // Velocity reasons
    data.velocityChecks.forEach(check => {
      if (check.exceeded) {
        reasons.push(
          `${check.type} velocity exceeded: ${check.current}/${check.threshold} in ${check.timeWindow}`
        );
      }
    });

    // Behavioral reasons
    if (data.behavioralAnalysis.anomalies) {
      data.behavioralAnalysis.anomalies.forEach((anomaly: any) => {
        if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
          reasons.push(`Behavioral anomaly: ${anomaly.description}`);
        }
      });
    }

    // Device reasons
    if (data.deviceRisk.riskFactors) {
      data.deviceRisk.riskFactors.forEach((factor: any) => {
        if (factor.detected && (factor.severity === 'high' || factor.severity === 'critical')) {
          reasons.push(`Device risk: ${factor.description}`);
        }
      });
    }

    // Rule engine reasons
    if (data.ruleEngineResults.triggeredRules) {
      data.ruleEngineResults.triggeredRules.forEach((rule: any) => {
        if (rule.triggered && rule.score > 20) {
          reasons.push(`Rule violation: ${rule.explanation}`);
        }
      });
    }

    return reasons;
  }

  private generateRecommendations(
    riskLevel: string,
    decision: string,
    reasons: string[]
  ): string[] {
    const recommendations = [];

    switch (decision) {
      case 'decline':
        recommendations.push('Block transaction immediately');
        recommendations.push('Flag user account for investigation');
        recommendations.push('Notify fraud team for manual review');
        break;
      case 'review':
        recommendations.push('Hold transaction for manual review');
        recommendations.push('Request additional verification');
        recommendations.push('Monitor user activity closely');
        break;
      case 'challenge':
        recommendations.push('Request step-up authentication');
        recommendations.push('Send verification SMS/email');
        recommendations.push('Apply transaction limits');
        break;
      case 'approve':
        if (riskLevel === 'medium') {
          recommendations.push('Monitor for additional suspicious activity');
        }
        break;
    }

    return recommendations;
  }

  private async createFraudCase(
    transaction: TransactionData,
    riskScore: number,
    reasons: string[]
  ): Promise<string> {
    const fraudCase = this.fraudCaseRepository.create({
      userId: transaction.userId,
      transactionId: transaction.id,
      fraudType: FraudType.TRANSACTION,
      status: FraudStatus.DETECTED,
      riskScore,
      transactionAmount: transaction.amount,
      currency: transaction.currency,
      paymentMethod: transaction.paymentMethod,
      ipAddress: transaction.ipAddress,
      userAgent: transaction.userAgent,
      location: transaction.location,
      detectedAt: new Date(),
      description: `High-risk transaction detected: ${reasons.join(', ')}`,
      evidence: {
        transaction: transaction,
        reasons: reasons,
        riskScore: riskScore,
      },
      mlPredictions: [],
      deviceFingerprint: transaction.deviceFingerprint || {},
      externalChecks: {},
      investigation: {
        assignedTo: null,
        priority: riskScore > 90 ? 'critical' : 'high',
        notes: [],
        evidence: [],
        timeline: [{
          timestamp: new Date(),
          action: 'case_created',
          actor: 'system',
          details: 'Fraud case automatically created by transaction monitoring',
        }],
      },
      resolution: null,
      isActive: true,
    });

    const saved = await this.fraudCaseRepository.save(fraudCase);
    return saved.id;
  }

  private async storeRiskScore(
    transaction: TransactionData,
    riskScore: number,
    analysisData: any
  ): Promise<void> {
    const riskScoreRecord = this.riskScoreRepository.create({
      entityId: transaction.id,
      entityType: RiskScoreType.TRANSACTION,
      riskScore,
      confidence: 85,
      scoreBreakdown: {
        identity: { score: 0, weight: 0, factors: [] },
        behavioral: {
          score: analysisData.behavioralAnalysis.riskScore || 0,
          weight: 30,
          factors: analysisData.behavioralAnalysis.anomalies?.map((a: any) => ({
            name: a.type,
            value: a.confidence,
            impact: a.severity === 'critical' ? 25 : a.severity === 'high' ? 20 : 10,
            description: a.description,
          })) || [],
        },
        deviceBased: {
          score: analysisData.deviceRisk.riskScore || 0,
          weight: 25,
          factors: analysisData.deviceRisk.riskFactors?.map((rf: any) => ({
            name: rf.factor,
            value: rf.detected ? 1 : 0,
            impact: rf.weight,
            description: rf.description,
          })) || [],
        },
        locationBased: { score: 0, weight: 0, factors: [] },
        velocity: {
          score: analysisData.velocityChecks.reduce((sum: number, check: VelocityCheck) => 
            sum + (check.exceeded ? 20 : 0), 0),
          weight: 25,
          factors: analysisData.velocityChecks.map((check: VelocityCheck) => ({
            name: check.type,
            value: check.current,
            impact: check.exceeded ? 20 : 0,
            description: `${check.type} in ${check.timeWindow}: ${check.current}/${check.threshold}`,
          })),
        },
        network: { score: 0, weight: 0, factors: [] },
        payment: { score: 0, weight: 0, factors: [] },
      },
      mlPredictions: [],
      ruleResults: analysisData.ruleEngineResults.triggeredRules || [],
      contextualFactors: {
        timeOfDay: transaction.timestamp.getHours().toString(),
        dayOfWeek: transaction.timestamp.getDay().toString(),
        isHoliday: false,
        eventType: 'transaction',
        ticketPrice: transaction.amount,
        paymentMethod: transaction.paymentMethod,
        userTenure: 0,
        previousTransactions: 0,
        accountAge: 0,
        deviceAge: 0,
        locationFamiliarity: 0,
      },
      velocityMetrics: {
        transactionVelocity: {
          last1Hour: analysisData.velocityChecks.find((c: VelocityCheck) => 
            c.type === 'transaction_count' && c.timeWindow === '1h')?.current || 0,
          last24Hours: analysisData.velocityChecks.find((c: VelocityCheck) => 
            c.type === 'transaction_count' && c.timeWindow === '24h')?.current || 0,
          last7Days: 0,
          threshold: 20,
          exceeded: analysisData.velocityChecks.some((c: VelocityCheck) => 
            c.type === 'transaction_count' && c.exceeded),
        },
        amountVelocity: {
          last1Hour: 0,
          last24Hours: analysisData.velocityChecks.find((c: VelocityCheck) => 
            c.type === 'amount_sum' && c.timeWindow === '24h')?.current || 0,
          last7Days: 0,
          threshold: 10000,
          exceeded: analysisData.velocityChecks.some((c: VelocityCheck) => 
            c.type === 'amount_sum' && c.exceeded),
        },
        deviceVelocity: {
          uniqueDevices24h: 1,
          uniqueDevices7d: 1,
          threshold: 5,
          exceeded: false,
        },
        locationVelocity: {
          uniqueLocations24h: 1,
          uniqueLocations7d: 1,
          impossibleTravel: false,
        },
      },
      externalSignals: analysisData.externalSignals || [],
      historicalComparison: {
        userBaseline: 30,
        deviceBaseline: analysisData.deviceRisk.riskScore || 50,
        globalBaseline: 25,
        deviationFromUser: riskScore - 30,
        deviationFromDevice: riskScore - (analysisData.deviceRisk.riskScore || 50),
        deviationFromGlobal: riskScore - 25,
      },
      triggeredBy: 'transaction_monitoring_service',
      recommendedActions: [],
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isActive: true,
    });

    await this.riskScoreRepository.save(riskScoreRecord);
  }

  // Mock helper methods (in production, these would query actual transaction data)
  private async getTransactionCount(userId: string, since: Date): Promise<number> {
    return Math.floor(Math.random() * 10);
  }

  private async getTransactionAmountSum(userId: string, since: Date): Promise<number> {
    return Math.floor(Math.random() * 5000);
  }

  private async getUniquePaymentMethods(userId: string, since: Date): Promise<number> {
    return Math.floor(Math.random() * 3) + 1;
  }

  private async checkIPReputation(ipAddress: string): Promise<{ risk: number }> {
    // Mock IP reputation check
    return { risk: Math.random() };
  }

  private async checkEmailReputation(userId: string): Promise<{ risk: number }> {
    // Mock email reputation check
    return { risk: Math.random() };
  }
}

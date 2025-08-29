import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BehavioralPattern } from '../entities/behavioral-pattern.entity';
import { FraudCase } from '../entities/fraud-case.entity';

export interface BehavioralAnalysisResult {
  riskScore: number;
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    description: string;
    value: number;
    baseline: number;
    deviation: number;
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    riskLevel: string;
    description: string;
  }>;
  recommendations: string[];
}

export interface UserBehaviorData {
  userId: string;
  sessionData: {
    duration: number;
    pageViews: number;
    clickPattern: number[];
    scrollBehavior: Record<string, any>;
    mouseMovements: Record<string, any>;
  };
  transactionData: {
    amount: number;
    frequency: number;
    timeOfDay: number;
    dayOfWeek: number;
    paymentMethod: string;
    location: {
      country: string;
      city: string;
      coordinates: [number, number];
    };
  };
  deviceData: {
    fingerprint: string;
    type: string;
    newDevice: boolean;
  };
  historicalData?: BehavioralPattern;
}

@Injectable()
export class BehavioralAnalysisService {
  private readonly logger = new Logger(BehavioralAnalysisService.name);

  constructor(
    @InjectRepository(BehavioralPattern)
    private behavioralPatternRepository: Repository<BehavioralPattern>,
    @InjectRepository(FraudCase)
    private fraudCaseRepository: Repository<FraudCase>,
  ) {}

  async analyzeBehavior(behaviorData: UserBehaviorData): Promise<BehavioralAnalysisResult> {
    try {
      this.logger.log(`Analyzing behavior for user: ${behaviorData.userId}`);

      // Get or create behavioral baseline
      const baseline = await this.getOrCreateBaseline(behaviorData.userId);
      
      // Perform anomaly detection
      const anomalies = await this.detectAnomalies(behaviorData, baseline);
      
      // Pattern recognition
      const patterns = await this.recognizePatterns(behaviorData);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(anomalies, patterns, behaviorData);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(anomalies, patterns, riskScore);
      
      // Update behavioral pattern
      await this.updateBehavioralPattern(baseline, behaviorData, anomalies);

      return {
        riskScore,
        anomalies,
        patterns,
        recommendations,
      };
    } catch (error) {
      this.logger.error(`Error analyzing behavior: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async getOrCreateBaseline(userId: string): Promise<BehavioralPattern> {
    let pattern = await this.behavioralPatternRepository.findOne({
      where: { userId, isActive: true },
    });

    if (!pattern) {
      pattern = this.behavioralPatternRepository.create({
        userId,
        baselineMetrics: {
          sessionDuration: { mean: 0, std: 0, min: 0, max: 0 },
          transactionAmount: { mean: 0, std: 0, min: 0, max: 0 },
          transactionFrequency: { mean: 0, std: 0, min: 0, max: 0 },
          timeOfDayPreference: {},
          dayOfWeekPreference: {},
          locationPatterns: [],
          devicePatterns: [],
          paymentMethodPreference: {},
        },
        anomalyHistory: [],
        mlFeatures: {},
        riskLevel: 'medium',
        confidenceScore: 0,
        sampleSize: 0,
        isActive: true,
      });
      
      await this.behavioralPatternRepository.save(pattern);
    }

    return pattern;
  }

  private async detectAnomalies(
    behaviorData: UserBehaviorData,
    baseline: BehavioralPattern,
  ): Promise<BehavioralAnalysisResult['anomalies']> {
    const anomalies = [];

    // Session duration anomaly
    const sessionAnomaly = this.detectSessionAnomalies(behaviorData.sessionData, baseline);
    if (sessionAnomaly) anomalies.push(sessionAnomaly);

    // Transaction amount anomaly
    const amountAnomaly = this.detectAmountAnomalies(behaviorData.transactionData, baseline);
    if (amountAnomaly) anomalies.push(amountAnomaly);

    // Time pattern anomaly
    const timeAnomaly = this.detectTimeAnomalies(behaviorData.transactionData, baseline);
    if (timeAnomaly) anomalies.push(timeAnomaly);

    // Location anomaly
    const locationAnomaly = this.detectLocationAnomalies(behaviorData.transactionData, baseline);
    if (locationAnomaly) anomalies.push(locationAnomaly);

    // Device anomaly
    const deviceAnomaly = this.detectDeviceAnomalies(behaviorData.deviceData, baseline);
    if (deviceAnomaly) anomalies.push(deviceAnomaly);

    // Velocity anomaly
    const velocityAnomaly = await this.detectVelocityAnomalies(behaviorData);
    if (velocityAnomaly) anomalies.push(velocityAnomaly);

    return anomalies;
  }

  private detectSessionAnomalies(sessionData: any, baseline: BehavioralPattern): any {
    const baselineDuration = baseline.baselineMetrics.sessionDuration;
    if (baselineDuration.mean === 0) return null;

    const deviation = Math.abs(sessionData.duration - baselineDuration.mean) / baselineDuration.std;
    
    if (deviation > 3) {
      return {
        type: 'session_duration',
        severity: deviation > 5 ? 'critical' : 'high',
        confidence: Math.min(95, deviation * 20),
        description: `Session duration significantly different from baseline`,
        value: sessionData.duration,
        baseline: baselineDuration.mean,
        deviation: deviation,
      };
    }

    return null;
  }

  private detectAmountAnomalies(transactionData: any, baseline: BehavioralPattern): any {
    const baselineAmount = baseline.baselineMetrics.transactionAmount;
    if (baselineAmount.mean === 0) return null;

    const deviation = Math.abs(transactionData.amount - baselineAmount.mean) / baselineAmount.std;
    
    if (deviation > 2.5) {
      return {
        type: 'transaction_amount',
        severity: deviation > 4 ? 'critical' : deviation > 3 ? 'high' : 'medium',
        confidence: Math.min(90, deviation * 25),
        description: `Transaction amount unusual for this user`,
        value: transactionData.amount,
        baseline: baselineAmount.mean,
        deviation: deviation,
      };
    }

    return null;
  }

  private detectTimeAnomalies(transactionData: any, baseline: BehavioralPattern): any {
    const timePrefs = baseline.baselineMetrics.timeOfDayPreference;
    const currentHour = transactionData.timeOfDay;
    
    const hourFrequency = timePrefs[currentHour] || 0;
    const avgFrequency = Object.values(timePrefs).reduce((a: number, b: number) => a + b, 0) / 24;
    
    if (hourFrequency < avgFrequency * 0.1 && avgFrequency > 0) {
      return {
        type: 'time_pattern',
        severity: 'medium',
        confidence: 70,
        description: `Transaction at unusual time for this user`,
        value: currentHour,
        baseline: avgFrequency,
        deviation: (avgFrequency - hourFrequency) / avgFrequency,
      };
    }

    return null;
  }

  private detectLocationAnomalies(transactionData: any, baseline: BehavioralPattern): any {
    const knownLocations = baseline.baselineMetrics.locationPatterns;
    const currentLocation = transactionData.location;
    
    const isKnownLocation = knownLocations.some(loc => 
      loc.country === currentLocation.country && loc.city === currentLocation.city
    );

    if (!isKnownLocation && knownLocations.length > 0) {
      return {
        type: 'location_pattern',
        severity: 'high',
        confidence: 85,
        description: `Transaction from new/unusual location`,
        value: `${currentLocation.city}, ${currentLocation.country}`,
        baseline: knownLocations.map(l => `${l.city}, ${l.country}`).join(', '),
        deviation: 1,
      };
    }

    return null;
  }

  private detectDeviceAnomalies(deviceData: any, baseline: BehavioralPattern): any {
    if (deviceData.newDevice) {
      const knownDevices = baseline.baselineMetrics.devicePatterns;
      
      if (knownDevices.length > 0) {
        return {
          type: 'device_pattern',
          severity: 'medium',
          confidence: 75,
          description: `Transaction from new device`,
          value: deviceData.fingerprint,
          baseline: `${knownDevices.length} known devices`,
          deviation: 1,
        };
      }
    }

    return null;
  }

  private async detectVelocityAnomalies(behaviorData: UserBehaviorData): Promise<any> {
    const recentTransactions = await this.getRecentTransactionCount(
      behaviorData.userId,
      new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentTransactions > 10) {
      return {
        type: 'velocity_pattern',
        severity: recentTransactions > 20 ? 'critical' : 'high',
        confidence: 90,
        description: `Unusually high transaction velocity`,
        value: recentTransactions,
        baseline: 3,
        deviation: recentTransactions / 3,
      };
    }

    return null;
  }

  private async recognizePatterns(behaviorData: UserBehaviorData): Promise<BehavioralAnalysisResult['patterns']> {
    const patterns = [];

    // Check for known fraud patterns
    const fraudPatterns = await this.checkFraudPatterns(behaviorData);
    patterns.push(...fraudPatterns);

    // Check for suspicious timing patterns
    const timingPatterns = this.checkTimingPatterns(behaviorData);
    patterns.push(...timingPatterns);

    // Check for device switching patterns
    const devicePatterns = this.checkDevicePatterns(behaviorData);
    patterns.push(...devicePatterns);

    return patterns;
  }

  private async checkFraudPatterns(behaviorData: UserBehaviorData): Promise<any[]> {
    const patterns = [];

    // Check against known fraud cases
    const similarFraudCases = await this.fraudCaseRepository
      .createQueryBuilder('fraud')
      .where('fraud.status = :status', { status: 'confirmed' })
      .andWhere('fraud.mlPredictions IS NOT NULL')
      .getMany();

    // Simple pattern matching (in production, use ML similarity)
    for (const fraudCase of similarFraudCases) {
      const similarity = this.calculateBehaviorSimilarity(behaviorData, fraudCase);
      
      if (similarity > 0.7) {
        patterns.push({
          pattern: 'similar_to_fraud',
          frequency: similarity,
          riskLevel: 'high',
          description: `Behavior similar to confirmed fraud case ${fraudCase.id}`,
        });
      }
    }

    return patterns;
  }

  private checkTimingPatterns(behaviorData: UserBehaviorData): any[] {
    const patterns = [];
    const hour = behaviorData.transactionData.timeOfDay;

    // Late night transactions (2 AM - 6 AM)
    if (hour >= 2 && hour <= 6) {
      patterns.push({
        pattern: 'late_night_activity',
        frequency: 1,
        riskLevel: 'medium',
        description: 'Transaction during unusual hours (2-6 AM)',
      });
    }

    return patterns;
  }

  private checkDevicePatterns(behaviorData: UserBehaviorData): any[] {
    const patterns = [];

    if (behaviorData.deviceData.newDevice) {
      patterns.push({
        pattern: 'new_device_transaction',
        frequency: 1,
        riskLevel: 'medium',
        description: 'First transaction from this device',
      });
    }

    return patterns;
  }

  private calculateRiskScore(
    anomalies: any[],
    patterns: any[],
    behaviorData: UserBehaviorData,
  ): number {
    let score = 0;

    // Anomaly contribution
    anomalies.forEach(anomaly => {
      const severityWeight = {
        low: 10,
        medium: 25,
        high: 40,
        critical: 60,
      };
      score += severityWeight[anomaly.severity] * (anomaly.confidence / 100);
    });

    // Pattern contribution
    patterns.forEach(pattern => {
      const riskWeight = {
        low: 5,
        medium: 15,
        high: 30,
        critical: 50,
      };
      score += riskWeight[pattern.riskLevel] * pattern.frequency;
    });

    // Base risk factors
    if (behaviorData.deviceData.newDevice) score += 10;
    if (behaviorData.transactionData.amount > 1000) score += 15;

    return Math.min(100, Math.max(0, score));
  }

  private generateRecommendations(
    anomalies: any[],
    patterns: any[],
    riskScore: number,
  ): string[] {
    const recommendations = [];

    if (riskScore > 80) {
      recommendations.push('Block transaction and require manual review');
      recommendations.push('Request additional authentication');
    } else if (riskScore > 60) {
      recommendations.push('Flag for manual review');
      recommendations.push('Apply additional verification steps');
    } else if (riskScore > 40) {
      recommendations.push('Monitor closely for additional suspicious activity');
      recommendations.push('Consider step-up authentication');
    }

    // Specific anomaly recommendations
    anomalies.forEach(anomaly => {
      switch (anomaly.type) {
        case 'location_pattern':
          recommendations.push('Verify location through additional means');
          break;
        case 'device_pattern':
          recommendations.push('Send device verification notification');
          break;
        case 'velocity_pattern':
          recommendations.push('Implement transaction velocity limits');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  private async updateBehavioralPattern(
    pattern: BehavioralPattern,
    behaviorData: UserBehaviorData,
    anomalies: any[],
  ): Promise<void> {
    // Update baseline metrics with new data
    this.updateBaselineMetrics(pattern, behaviorData);
    
    // Add anomalies to history
    pattern.anomalyHistory.push(...anomalies.map(a => ({
      ...a,
      timestamp: new Date(),
    })));

    // Keep only recent anomalies (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    pattern.anomalyHistory = pattern.anomalyHistory.filter(
      a => new Date(a.timestamp) > thirtyDaysAgo
    );

    // Update ML features
    pattern.mlFeatures = this.extractMLFeatures(behaviorData, pattern);
    
    // Update confidence and sample size
    pattern.sampleSize += 1;
    pattern.confidenceScore = Math.min(95, pattern.sampleSize * 2);

    await this.behavioralPatternRepository.save(pattern);
  }

  private updateBaselineMetrics(pattern: BehavioralPattern, behaviorData: UserBehaviorData): void {
    const metrics = pattern.baselineMetrics;
    const n = pattern.sampleSize;

    // Update session duration
    if (n === 0) {
      metrics.sessionDuration = {
        mean: behaviorData.sessionData.duration,
        std: 0,
        min: behaviorData.sessionData.duration,
        max: behaviorData.sessionData.duration,
      };
    } else {
      const oldMean = metrics.sessionDuration.mean;
      metrics.sessionDuration.mean = (oldMean * n + behaviorData.sessionData.duration) / (n + 1);
      metrics.sessionDuration.min = Math.min(metrics.sessionDuration.min, behaviorData.sessionData.duration);
      metrics.sessionDuration.max = Math.max(metrics.sessionDuration.max, behaviorData.sessionData.duration);
    }

    // Update transaction amount
    if (n === 0) {
      metrics.transactionAmount = {
        mean: behaviorData.transactionData.amount,
        std: 0,
        min: behaviorData.transactionData.amount,
        max: behaviorData.transactionData.amount,
      };
    } else {
      const oldMean = metrics.transactionAmount.mean;
      metrics.transactionAmount.mean = (oldMean * n + behaviorData.transactionData.amount) / (n + 1);
      metrics.transactionAmount.min = Math.min(metrics.transactionAmount.min, behaviorData.transactionData.amount);
      metrics.transactionAmount.max = Math.max(metrics.transactionAmount.max, behaviorData.transactionData.amount);
    }

    // Update time preferences
    const hour = behaviorData.transactionData.timeOfDay;
    metrics.timeOfDayPreference[hour] = (metrics.timeOfDayPreference[hour] || 0) + 1;

    // Update location patterns
    const location = behaviorData.transactionData.location;
    const existingLocation = metrics.locationPatterns.find(
      l => l.country === location.country && l.city === location.city
    );
    
    if (existingLocation) {
      existingLocation.frequency += 1;
    } else {
      metrics.locationPatterns.push({
        country: location.country,
        city: location.city,
        coordinates: location.coordinates,
        frequency: 1,
      });
    }
  }

  private extractMLFeatures(behaviorData: UserBehaviorData, pattern: BehavioralPattern): Record<string, number> {
    return {
      session_duration: behaviorData.sessionData.duration,
      transaction_amount: behaviorData.transactionData.amount,
      time_of_day: behaviorData.transactionData.timeOfDay,
      day_of_week: behaviorData.transactionData.dayOfWeek,
      is_new_device: behaviorData.deviceData.newDevice ? 1 : 0,
      location_familiarity: this.calculateLocationFamiliarity(behaviorData, pattern),
      transaction_velocity: pattern.sampleSize,
      anomaly_count: pattern.anomalyHistory.length,
    };
  }

  private calculateLocationFamiliarity(behaviorData: UserBehaviorData, pattern: BehavioralPattern): number {
    const location = behaviorData.transactionData.location;
    const knownLocation = pattern.baselineMetrics.locationPatterns.find(
      l => l.country === location.country && l.city === location.city
    );
    
    return knownLocation ? knownLocation.frequency / pattern.sampleSize : 0;
  }

  private calculateBehaviorSimilarity(behaviorData: UserBehaviorData, fraudCase: FraudCase): number {
    // Simplified similarity calculation
    // In production, use more sophisticated ML similarity metrics
    let similarity = 0;
    let factors = 0;

    // Amount similarity
    if (fraudCase.transactionAmount) {
      const amountDiff = Math.abs(behaviorData.transactionData.amount - fraudCase.transactionAmount);
      similarity += Math.max(0, 1 - amountDiff / fraudCase.transactionAmount);
      factors++;
    }

    // Time similarity
    if (fraudCase.detectedAt) {
      const fraudHour = fraudCase.detectedAt.getHours();
      const timeDiff = Math.abs(behaviorData.transactionData.timeOfDay - fraudHour);
      similarity += Math.max(0, 1 - timeDiff / 12);
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  private async getRecentTransactionCount(userId: string, since: Date): Promise<number> {
    // This would typically query a transactions table
    // For now, return a mock count
    return Math.floor(Math.random() * 25);
  }
}

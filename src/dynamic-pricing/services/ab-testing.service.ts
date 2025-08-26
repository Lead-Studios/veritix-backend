import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

import { ABTest, ABTestStatus } from '../entities/ab-test.entity';

export interface ABTestResult {
  testId: string;
  winner: string;
  confidence: number;
  significance: number;
  variants: Array<{
    id: string;
    name: string;
    participants: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    averageOrderValue: number;
  }>;
}

export interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(
    @InjectRepository(ABTest)
    private abTestRepository: Repository<ABTest>,
  ) {}

  async createABTest(testData: {
    name: string;
    description?: string;
    eventId: string;
    variants: Array<{
      name: string;
      description: string;
      trafficPercentage: number;
      pricingStrategy: any;
    }>;
    metric: string;
    confidenceLevel: number;
    minimumDetectableEffect?: number;
    startDate: Date;
    endDate: Date;
  }): Promise<ABTest> {
    try {
      // Validate traffic percentages sum to 100
      const totalTraffic = testData.variants.reduce((sum, variant) => sum + variant.trafficPercentage, 0);
      if (Math.abs(totalTraffic - 100) > 0.01) {
        throw new Error('Variant traffic percentages must sum to 100%');
      }

      // Generate variant IDs
      const variants = testData.variants.map((variant, index) => ({
        id: `variant_${index + 1}`,
        ...variant,
      }));

      const abTest = this.abTestRepository.create({
        ...testData,
        variants,
        status: ABTestStatus.DRAFT,
      });

      const savedTest = await this.abTestRepository.save(abTest);
      this.logger.log(`Created A/B test: ${savedTest.name} (${savedTest.id})`);

      return savedTest;

    } catch (error) {
      this.logger.error('Error creating A/B test:', error);
      throw error;
    }
  }

  async startABTest(testId: string): Promise<void> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test) {
        throw new Error('A/B test not found');
      }

      if (test.status !== ABTestStatus.DRAFT) {
        throw new Error('Only draft tests can be started');
      }

      test.status = ABTestStatus.RUNNING;
      await this.abTestRepository.save(test);

      this.logger.log(`Started A/B test: ${test.name}`);

    } catch (error) {
      this.logger.error(`Error starting A/B test ${testId}:`, error);
      throw error;
    }
  }

  async pauseABTest(testId: string): Promise<void> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test) {
        throw new Error('A/B test not found');
      }

      test.status = ABTestStatus.PAUSED;
      await this.abTestRepository.save(test);

      this.logger.log(`Paused A/B test: ${test.name}`);

    } catch (error) {
      this.logger.error(`Error pausing A/B test ${testId}:`, error);
      throw error;
    }
  }

  async getVariantForUser(eventId: string, userId: string): Promise<string | null> {
    try {
      const activeTest = await this.abTestRepository.findOne({
        where: {
          eventId,
          status: ABTestStatus.RUNNING,
          startDate: Between(new Date('1970-01-01'), new Date()),
          endDate: Between(new Date(), new Date('2099-12-31')),
        },
      });

      if (!activeTest) {
        return null;
      }

      // Use consistent hashing to assign users to variants
      const hash = this.hashUserId(userId + activeTest.id);
      const hashValue = hash % 100;

      let cumulativePercentage = 0;
      for (const variant of activeTest.variants) {
        cumulativePercentage += variant.trafficPercentage;
        if (hashValue < cumulativePercentage) {
          return variant.id;
        }
      }

      // Fallback to first variant
      return activeTest.variants[0]?.id || null;

    } catch (error) {
      this.logger.error(`Error getting variant for user ${userId} in event ${eventId}:`, error);
      return null;
    }
  }

  private hashUserId(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  async recordConversion(
    testId: string,
    variantId: string,
    userId: string,
    revenue: number = 0
  ): Promise<void> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test || test.status !== ABTestStatus.RUNNING) {
        return;
      }

      // Initialize results if not exists
      if (!test.results) {
        test.results = {
          variants: test.variants.map(v => ({
            id: v.id,
            participants: 0,
            conversions: 0,
            revenue: 0,
            conversionRate: 0,
            averageOrderValue: 0,
          })),
          significance: 0,
          confidenceInterval: { lower: 0, upper: 0 },
        };
      }

      // Update variant results
      const variantResult = test.results.variants.find(v => v.id === variantId);
      if (variantResult) {
        variantResult.conversions += 1;
        variantResult.revenue += revenue;
        variantResult.conversionRate = (variantResult.conversions / variantResult.participants) * 100;
        variantResult.averageOrderValue = variantResult.conversions > 0 
          ? variantResult.revenue / variantResult.conversions 
          : 0;
      }

      await this.abTestRepository.save(test);

    } catch (error) {
      this.logger.error(`Error recording conversion for test ${testId}:`, error);
    }
  }

  async recordParticipant(testId: string, variantId: string, userId: string): Promise<void> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test || test.status !== ABTestStatus.RUNNING) {
        return;
      }

      // Initialize results if not exists
      if (!test.results) {
        test.results = {
          variants: test.variants.map(v => ({
            id: v.id,
            participants: 0,
            conversions: 0,
            revenue: 0,
            conversionRate: 0,
            averageOrderValue: 0,
          })),
          significance: 0,
          confidenceInterval: { lower: 0, upper: 0 },
        };
      }

      // Update participant count
      const variantResult = test.results.variants.find(v => v.id === variantId);
      if (variantResult) {
        variantResult.participants += 1;
        variantResult.conversionRate = variantResult.participants > 0 
          ? (variantResult.conversions / variantResult.participants) * 100 
          : 0;
      }

      await this.abTestRepository.save(test);

    } catch (error) {
      this.logger.error(`Error recording participant for test ${testId}:`, error);
    }
  }

  async analyzeABTest(testId: string): Promise<ABTestResult | null> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test || !test.results) {
        return null;
      }

      // Calculate statistical significance
      const significance = this.calculateStatisticalSignificance(test.results.variants);
      
      // Determine winner
      let winner = '';
      let bestMetric = 0;
      
      for (const variant of test.results.variants) {
        const metricValue = test.metric === 'revenue' 
          ? variant.revenue 
          : test.metric === 'conversion_rate' 
            ? variant.conversionRate 
            : variant.conversions;
            
        if (metricValue > bestMetric) {
          bestMetric = metricValue;
          winner = variant.id;
        }
      }

      // Update test results
      test.results.winner = winner;
      test.results.significance = significance.pValue;
      test.results.confidenceInterval = significance.confidenceInterval;

      await this.abTestRepository.save(test);

      return {
        testId: test.id,
        winner,
        confidence: (1 - significance.pValue) * 100,
        significance: significance.pValue,
        variants: test.results.variants,
      };

    } catch (error) {
      this.logger.error(`Error analyzing A/B test ${testId}:`, error);
      return null;
    }
  }

  private calculateStatisticalSignificance(variants: any[]): StatisticalSignificance {
    if (variants.length < 2) {
      return {
        isSignificant: false,
        pValue: 1.0,
        confidenceInterval: { lower: 0, upper: 0 },
      };
    }

    // Simple two-proportion z-test for conversion rates
    const [variantA, variantB] = variants;
    
    const n1 = variantA.participants;
    const n2 = variantB.participants;
    const x1 = variantA.conversions;
    const x2 = variantB.conversions;

    if (n1 === 0 || n2 === 0) {
      return {
        isSignificant: false,
        pValue: 1.0,
        confidenceInterval: { lower: 0, upper: 0 },
      };
    }

    const p1 = x1 / n1;
    const p2 = x2 / n2;
    const pPool = (x1 + x2) / (n1 + n2);
    
    const standardError = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
    const zScore = Math.abs(p1 - p2) / standardError;
    
    // Approximate p-value calculation
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    // 95% confidence interval for difference in proportions
    const seDiff = Math.sqrt((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2));
    const marginOfError = 1.96 * seDiff;
    const diff = p1 - p2;
    
    return {
      isSignificant: pValue < 0.05,
      pValue,
      confidenceInterval: {
        lower: diff - marginOfError,
        upper: diff + marginOfError,
      },
    };
  }

  private normalCDF(x: number): number {
    // Approximation of the cumulative distribution function for standard normal distribution
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    
    return x > 0 ? 1 - prob : prob;
  }

  async completeABTest(testId: string): Promise<ABTestResult | null> {
    try {
      const test = await this.abTestRepository.findOne({ where: { id: testId } });
      if (!test) {
        throw new Error('A/B test not found');
      }

      // Analyze final results
      const results = await this.analyzeABTest(testId);
      
      // Mark test as completed
      test.status = ABTestStatus.COMPLETED;
      await this.abTestRepository.save(test);

      this.logger.log(`Completed A/B test: ${test.name}, Winner: ${results?.winner}`);

      return results;

    } catch (error) {
      this.logger.error(`Error completing A/B test ${testId}:`, error);
      throw error;
    }
  }

  async getActiveABTests(eventId?: string): Promise<ABTest[]> {
    const whereClause: any = {
      status: ABTestStatus.RUNNING,
      startDate: Between(new Date('1970-01-01'), new Date()),
      endDate: Between(new Date(), new Date('2099-12-31')),
    };

    if (eventId) {
      whereClause.eventId = eventId;
    }

    return this.abTestRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
    });
  }

  async getABTestResults(testId: string): Promise<ABTestResult | null> {
    return this.analyzeABTest(testId);
  }

  async calculateSampleSize(
    baseConversionRate: number,
    minimumDetectableEffect: number,
    confidenceLevel: number = 95,
    power: number = 80
  ): Promise<number> {
    // Sample size calculation for A/B test
    const alpha = (100 - confidenceLevel) / 100;
    const beta = (100 - power) / 100;
    
    const p1 = baseConversionRate / 100;
    const p2 = p1 * (1 + minimumDetectableEffect / 100);
    
    const zAlpha = this.inverseNormalCDF(1 - alpha / 2);
    const zBeta = this.inverseNormalCDF(1 - beta);
    
    const pooledP = (p1 + p2) / 2;
    const numerator = Math.pow(zAlpha * Math.sqrt(2 * pooledP * (1 - pooledP)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
    const denominator = Math.pow(p2 - p1, 2);
    
    return Math.ceil(numerator / denominator);
  }

  private inverseNormalCDF(p: number): number {
    // Approximation of the inverse normal CDF (for sample size calculation)
    if (p <= 0 || p >= 1) {
      throw new Error('Probability must be between 0 and 1');
    }
    
    // Beasley-Springer-Moro algorithm approximation
    const a = [0, -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [0, -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [0, -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [0, 7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    
    let x: number;
    
    if (p < pLow) {
      const q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    } else if (p <= pHigh) {
      const q = p - 0.5;
      const r = q * q;
      x = (((((a[1] * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r + a[6]) * q / (((((b[1] * r + b[2]) * r + b[3]) * r + b[4]) * r + b[5]) * r + 1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[1] * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) * q + c[6]) / ((((d[1] * q + d[2]) * q + d[3]) * q + d[4]) * q + 1);
    }
    
    return x;
  }
}

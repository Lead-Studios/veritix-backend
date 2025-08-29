import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DemographicCategory {
  AGE = 'age',
  GENDER = 'gender',
  LOCATION = 'location',
  INCOME = 'income',
  EDUCATION = 'education',
  OCCUPATION = 'occupation',
  INTERESTS = 'interests',
  DEVICE = 'device',
  BEHAVIOR = 'behavior',
}

@Entity('demographics_data')
@Index(['eventId', 'category', 'timestamp'])
@Index(['timestamp'])
@Index(['category'])
export class DemographicsData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({
    type: 'enum',
    enum: DemographicCategory,
  })
  @Index()
  category: DemographicCategory;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;

  @Column({ type: 'json' })
  ageDistribution: {
    ranges: Array<{
      min: number;
      max: number;
      count: number;
      percentage: number;
      revenue: number;
      averageSpend: number;
      conversionRate: number;
    }>;
    averageAge: number;
    medianAge: number;
    dominantRange: string;
    trends: {
      growingSegments: string[];
      decliningSegments: string[];
    };
  };

  @Column({ type: 'json' })
  genderDistribution: {
    breakdown: Array<{
      gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | 'other';
      count: number;
      percentage: number;
      revenue: number;
      averageSpend: number;
      conversionRate: number;
    }>;
    dominantGender: string;
    diversityIndex: number;
    trends: {
      growingSegments: string[];
      decliningSegments: string[];
    };
  };

  @Column({ type: 'json' })
  geographicDistribution: {
    countries: Array<{
      country: string;
      countryCode: string;
      count: number;
      percentage: number;
      revenue: number;
      averageSpend: number;
      conversionRate: number;
    }>;
    regions: Array<{
      region: string;
      count: number;
      percentage: number;
      revenue: number;
      cities: Array<{
        city: string;
        count: number;
        percentage: number;
        revenue: number;
      }>;
    }>;
    timeZones: Array<{
      timezone: string;
      count: number;
      percentage: number;
      peakActivityHours: number[];
    }>;
    topMarkets: string[];
    emergingMarkets: string[];
    marketPenetration: Record<string, number>;
  };

  @Column({ type: 'json' })
  incomeDistribution: {
    brackets: Array<{
      min: number;
      max: number;
      count: number;
      percentage: number;
      revenue: number;
      averageSpend: number;
      ticketTierPreference: string[];
    }>;
    averageIncome: number;
    medianIncome: number;
    purchasingPower: {
      high: number;
      medium: number;
      low: number;
    };
    priceElasticity: number;
  };

  @Column({ type: 'json' })
  educationDistribution: {
    levels: Array<{
      level: 'high-school' | 'college' | 'bachelor' | 'master' | 'doctorate' | 'other';
      count: number;
      percentage: number;
      revenue: number;
      averageSpend: number;
    }>;
    dominantLevel: string;
    correlationWithSpending: number;
  };

  @Column({ type: 'json' })
  occupationDistribution: {
    categories: Array<{
      category: string;
      count: number;
      percentage: number;
      revenue: number;
      averageSpend: number;
      jobTitles: Array<{
        title: string;
        count: number;
      }>;
    }>;
    industries: Array<{
      industry: string;
      count: number;
      percentage: number;
      revenue: number;
    }>;
    employmentStatus: Array<{
      status: 'employed' | 'unemployed' | 'student' | 'retired' | 'self-employed';
      count: number;
      percentage: number;
      revenue: number;
    }>;
  };

  @Column({ type: 'json' })
  interestsAndPreferences: {
    categories: Array<{
      category: string;
      count: number;
      percentage: number;
      engagement: number;
      relatedEvents: string[];
    }>;
    musicGenres: Array<{
      genre: string;
      count: number;
      percentage: number;
    }>;
    eventTypes: Array<{
      type: string;
      count: number;
      percentage: number;
      crossoverRate: number;
    }>;
    brands: Array<{
      brand: string;
      affinity: number;
      count: number;
    }>;
    lifestyle: Array<{
      trait: string;
      count: number;
      percentage: number;
    }>;
  };

  @Column({ type: 'json' })
  deviceAndTechProfile: {
    devices: Array<{
      type: 'desktop' | 'mobile' | 'tablet';
      brand: string;
      model: string;
      os: string;
      browser: string;
      count: number;
      percentage: number;
      conversionRate: number;
      averageSessionTime: number;
    }>;
    techSavviness: {
      high: number;
      medium: number;
      low: number;
    };
    appUsage: Array<{
      app: string;
      usage: 'heavy' | 'moderate' | 'light';
      count: number;
    }>;
    socialMediaPresence: Array<{
      platform: string;
      count: number;
      engagement: number;
    }>;
  };

  @Column({ type: 'json' })
  behavioralPatterns: {
    purchaseTimings: Array<{
      timeframe: string;
      count: number;
      percentage: number;
      description: string;
    }>;
    decisionMakingSpeed: {
      immediate: number; // < 1 hour
      quick: number; // 1-24 hours
      considered: number; // 1-7 days
      deliberate: number; // > 7 days
    };
    pricesensitivity: {
      low: number;
      medium: number;
      high: number;
    };
    loyaltyIndicators: {
      repeatAttendees: number;
      brandFollowers: number;
      referralMakers: number;
    };
    socialInfluence: {
      friendInfluenced: number;
      socialMediaInfluenced: number;
      reviewInfluenced: number;
      independentDecision: number;
    };
    communicationPreferences: Array<{
      channel: string;
      preference: number;
      effectiveness: number;
    }>;
  };

  @Column({ type: 'json' })
  psychographicProfile: {
    personality: Array<{
      trait: string;
      score: number;
      count: number;
    }>;
    values: Array<{
      value: string;
      importance: number;
      count: number;
    }>;
    lifestyle: Array<{
      segment: string;
      count: number;
      percentage: number;
      characteristics: string[];
    }>;
    motivations: Array<{
      motivation: string;
      strength: number;
      count: number;
    }>;
  };

  @Column({ type: 'json' })
  segmentAnalysis: {
    primarySegments: Array<{
      segmentId: string;
      name: string;
      size: number;
      percentage: number;
      revenue: number;
      characteristics: string[];
      value: number;
      growth: number;
    }>;
    crossSegmentBehavior: Array<{
      segment1: string;
      segment2: string;
      overlap: number;
      combinedValue: number;
    }>;
    targetingRecommendations: Array<{
      segment: string;
      strategy: string;
      expectedROI: number;
      confidence: number;
    }>;
  };

  @Column({ type: 'int', default: 0 })
  totalSampleSize: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidenceLevel: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  marginOfError: number;

  @Column({ type: 'timestamp', nullable: true })
  lastUpdated: Date;

  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual fields
  get diversityScore(): number {
    let totalDiversity = 0;
    let categories = 0;

    // Age diversity
    if (this.ageDistribution.ranges.length > 0) {
      const ageEntropy = this.calculateEntropy(
        this.ageDistribution.ranges.map(r => r.percentage)
      );
      totalDiversity += ageEntropy;
      categories++;
    }

    // Gender diversity
    if (this.genderDistribution.breakdown.length > 0) {
      const genderEntropy = this.calculateEntropy(
        this.genderDistribution.breakdown.map(g => g.percentage)
      );
      totalDiversity += genderEntropy;
      categories++;
    }

    // Geographic diversity
    if (this.geographicDistribution.countries.length > 0) {
      const geoEntropy = this.calculateEntropy(
        this.geographicDistribution.countries.map(c => c.percentage)
      );
      totalDiversity += geoEntropy;
      categories++;
    }

    return categories > 0 ? (totalDiversity / categories) * 100 : 0;
  }

  get dominantDemographic(): string {
    const dominantAge = this.ageDistribution.dominantRange;
    const dominantGender = this.genderDistribution.dominantGender;
    const dominantCountry = this.geographicDistribution.countries
      .sort((a, b) => b.percentage - a.percentage)[0]?.country || 'Unknown';

    return `${dominantAge} ${dominantGender} from ${dominantCountry}`;
  }

  get highValueSegments(): Array<{ segment: string; value: number }> {
    return this.segmentAnalysis.primarySegments
      .filter(segment => segment.value > this.averageSegmentValue)
      .map(segment => ({
        segment: segment.name,
        value: segment.value,
      }))
      .sort((a, b) => b.value - a.value);
  }

  get averageSegmentValue(): number {
    const segments = this.segmentAnalysis.primarySegments;
    return segments.length > 0 
      ? segments.reduce((sum, seg) => sum + seg.value, 0) / segments.length 
      : 0;
  }

  get marketPotential(): 'high' | 'medium' | 'low' {
    const score = this.diversityScore;
    const valueSegments = this.highValueSegments.length;
    const totalRevenue = this.geographicDistribution.countries
      .reduce((sum, country) => sum + country.revenue, 0);

    const potential = (score * 0.3) + (valueSegments * 10) + (totalRevenue / 1000);

    if (potential > 80) return 'high';
    if (potential > 40) return 'medium';
    return 'low';
  }

  get topRevenueGeneratingDemographic(): string {
    const topAge = this.ageDistribution.ranges
      .sort((a, b) => b.revenue - a.revenue)[0];
    const topGender = this.genderDistribution.breakdown
      .sort((a, b) => b.revenue - a.revenue)[0];
    const topCountry = this.geographicDistribution.countries
      .sort((a, b) => b.revenue - a.revenue)[0];

    return `${topAge?.min}-${topAge?.max} year old ${topGender?.gender} from ${topCountry?.country}`;
  }

  get emergingTrends(): string[] {
    const trends: string[] = [];

    // Age trends
    trends.push(...this.ageDistribution.trends.growingSegments.map(s => `Growing: ${s}`));

    // Gender trends
    trends.push(...this.genderDistribution.trends.growingSegments.map(s => `Growing: ${s}`));

    // Geographic trends
    trends.push(...this.geographicDistribution.emergingMarkets.map(m => `Emerging market: ${m}`));

    return trends;
  }

  get targetingOpportunities(): Array<{ opportunity: string; potential: number }> {
    return this.segmentAnalysis.targetingRecommendations
      .map(rec => ({
        opportunity: `${rec.segment}: ${rec.strategy}`,
        potential: rec.expectedROI,
      }))
      .sort((a, b) => b.potential - a.potential);
  }

  private calculateEntropy(percentages: number[]): number {
    const total = percentages.reduce((sum, p) => sum + p, 0);
    if (total === 0) return 0;

    const probabilities = percentages.map(p => p / total);
    return -probabilities.reduce((entropy, p) => {
      return p > 0 ? entropy + (p * Math.log2(p)) : entropy;
    }, 0);
  }

  get dataQualityScore(): number {
    let score = 0;
    let maxScore = 0;

    // Sample size quality
    maxScore += 25;
    if (this.totalSampleSize > 1000) score += 25;
    else if (this.totalSampleSize > 500) score += 20;
    else if (this.totalSampleSize > 100) score += 15;
    else if (this.totalSampleSize > 50) score += 10;

    // Confidence level quality
    maxScore += 25;
    if (this.confidenceLevel >= 95) score += 25;
    else if (this.confidenceLevel >= 90) score += 20;
    else if (this.confidenceLevel >= 85) score += 15;

    // Data freshness
    maxScore += 25;
    const hoursOld = this.lastUpdated 
      ? (Date.now() - this.lastUpdated.getTime()) / (1000 * 60 * 60)
      : 24;
    
    if (hoursOld < 1) score += 25;
    else if (hoursOld < 6) score += 20;
    else if (hoursOld < 24) score += 15;
    else if (hoursOld < 72) score += 10;

    // Completeness
    maxScore += 25;
    let completedCategories = 0;
    if (this.ageDistribution.ranges.length > 0) completedCategories++;
    if (this.genderDistribution.breakdown.length > 0) completedCategories++;
    if (this.geographicDistribution.countries.length > 0) completedCategories++;
    if (this.incomeDistribution.brackets.length > 0) completedCategories++;
    if (this.behavioralPatterns.purchaseTimings.length > 0) completedCategories++;

    score += (completedCategories / 5) * 25;

    return maxScore > 0 ? (score / maxScore) * 100 : 0;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DemographicsData, DemographicCategory } from '../entities/demographics-data.entity';

export interface DemographicInsight {
  category: string;
  insight: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  recommendations: string[];
}

@Injectable()
export class DemographicsAnalysisService {
  private readonly logger = new Logger(DemographicsAnalysisService.name);

  constructor(
    @InjectRepository(DemographicsData)
    private demographicsRepository: Repository<DemographicsData>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {}

  async analyzeAttendeeProfile(eventId: string, attendeeData: {
    userId: string;
    age?: number;
    gender?: string;
    location?: { country: string; region: string; city: string };
    income?: number;
    education?: string;
    occupation?: string;
    interests?: string[];
    deviceInfo?: { type: 'desktop' | 'mobile' | 'tablet'; os: string; browser: string };
    behaviorData?: { timeOnSite: number; pagesViewed: number; socialMediaActivity: string[] };
    timestamp: Date;
  }): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let demographics = await this.demographicsRepository.findOne({
        where: { eventId, category: DemographicCategory.BEHAVIOR, timestamp: today },
      });

      if (!demographics) {
        demographics = await this.createNewDemographicsRecord(eventId, today);
      }

      this.updateDemographics(demographics, attendeeData);
      demographics.totalSampleSize += 1;
      demographics.lastUpdated = new Date();
      demographics.confidenceLevel = this.calculateConfidenceLevel(demographics.totalSampleSize);
      demographics.marginOfError = this.calculateMarginOfError(demographics.totalSampleSize);

      await this.updateSegmentAnalysis(demographics);
      await this.demographicsRepository.save(demographics);

      const insights = await this.generateDemographicInsights(eventId, demographics);

      this.eventEmitter.emit('demographics.updated', { eventId, attendeeData, demographics, insights });

    } catch (error) {
      this.logger.error(`Failed to analyze attendee profile for event ${eventId}:`, error);
      throw error;
    }
  }

  async getRealTimeDemographics(eventId: string): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const demographics = await this.demographicsRepository.findOne({
        where: { eventId, category: DemographicCategory.BEHAVIOR, timestamp: today },
      });

      if (!demographics) {
        return this.getEmptyDemographics();
      }

      const insights = await this.generateDemographicInsights(eventId, demographics);
      const trendingSegments = this.identifyTrendingSegments(demographics);
      const marketOpportunities = this.identifyMarketOpportunities(demographics);

      return {
        demographics,
        insights,
        trendingSegments,
        marketOpportunities,
        qualityScore: demographics.dataQualityScore,
        lastUpdated: demographics.lastUpdated,
      };

    } catch (error) {
      this.logger.error(`Failed to get real-time demographics for event ${eventId}:`, error);
      throw error;
    }
  }

  private async createNewDemographicsRecord(eventId: string, timestamp: Date): Promise<DemographicsData> {
    return this.demographicsRepository.create({
      eventId,
      category: DemographicCategory.BEHAVIOR,
      timestamp,
      ageDistribution: {
        ranges: [],
        averageAge: 0,
        medianAge: 0,
        dominantRange: '',
        trends: { growingSegments: [], decliningSegments: [] },
      },
      genderDistribution: {
        breakdown: [],
        dominantGender: '',
        diversityIndex: 0,
        trends: { growingSegments: [], decliningSegments: [] },
      },
      geographicDistribution: {
        countries: [],
        regions: [],
        timeZones: [],
        topMarkets: [],
        emergingMarkets: [],
        marketPenetration: {},
      },
      incomeDistribution: {
        brackets: [],
        averageIncome: 0,
        medianIncome: 0,
        purchasingPower: { high: 0, medium: 0, low: 0 },
        priceElasticity: 0,
      },
      educationDistribution: {
        levels: [],
        dominantLevel: '',
        correlationWithSpending: 0,
      },
      occupationDistribution: {
        categories: [],
        industries: [],
        employmentStatus: [],
      },
      interestsAndPreferences: {
        categories: [],
        musicGenres: [],
        eventTypes: [],
        brands: [],
        lifestyle: [],
      },
      deviceAndTechProfile: {
        devices: [],
        techSavviness: { high: 0, medium: 0, low: 0 },
        appUsage: [],
        socialMediaPresence: [],
      },
      behavioralPatterns: {
        purchaseTimings: [],
        decisionMakingSpeed: { immediate: 0, quick: 0, considered: 0, deliberate: 0 },
        pricesensitivity: { low: 0, medium: 0, high: 0 },
        loyaltyIndicators: { repeatAttendees: 0, brandFollowers: 0, referralMakers: 0 },
        socialInfluence: {
          friendInfluenced: 0,
          socialMediaInfluenced: 0,
          reviewInfluenced: 0,
          independentDecision: 0,
        },
        communicationPreferences: [],
      },
      psychographicProfile: {
        personality: [],
        values: [],
        lifestyle: [],
        motivations: [],
      },
      segmentAnalysis: {
        primarySegments: [],
        crossSegmentBehavior: [],
        targetingRecommendations: [],
      },
      totalSampleSize: 0,
      confidenceLevel: 0,
      marginOfError: 0,
      lastUpdated: new Date(),
    });
  }

  private updateDemographics(demographics: DemographicsData, attendeeData: any): void {
    if (attendeeData.age) this.updateAgeDistribution(demographics, attendeeData);
    if (attendeeData.gender) this.updateGenderDistribution(demographics, attendeeData);
    if (attendeeData.location) this.updateGeographicDistribution(demographics, attendeeData);
    if (attendeeData.income) this.updateIncomeDistribution(demographics, attendeeData);
    if (attendeeData.education) this.updateEducationDistribution(demographics, attendeeData);
    if (attendeeData.occupation) this.updateOccupationDistribution(demographics, attendeeData);
    if (attendeeData.interests) this.updateInterestsAndPreferences(demographics, attendeeData);
    if (attendeeData.deviceInfo) this.updateDeviceAndTechProfile(demographics, attendeeData);
    if (attendeeData.behaviorData) this.updateBehavioralPatterns(demographics, attendeeData);
  }

  private updateAgeDistribution(demographics: DemographicsData, attendeeData: any): void {
    const ageRange = this.getAgeRange(attendeeData.age);
    let ageGroup = demographics.ageDistribution.ranges.find(r => r.min <= attendeeData.age && r.max >= attendeeData.age);

    if (!ageGroup) {
      ageGroup = {
        min: ageRange.min,
        max: ageRange.max,
        count: 0,
        percentage: 0,
        revenue: 0,
        averageSpend: 0,
        conversionRate: 0,
      };
      demographics.ageDistribution.ranges.push(ageGroup);
    }

    ageGroup.count += 1;
    this.recalculateAgePercentages(demographics);
  }

  private updateGenderDistribution(demographics: DemographicsData, attendeeData: any): void {
    let genderData = demographics.genderDistribution.breakdown.find(g => g.gender === attendeeData.gender);

    if (!genderData) {
      genderData = {
        gender: attendeeData.gender,
        count: 0,
        percentage: 0,
        revenue: 0,
        averageSpend: 0,
        conversionRate: 0,
      };
      demographics.genderDistribution.breakdown.push(genderData);
    }

    genderData.count += 1;
    this.recalculateGenderPercentages(demographics);
  }

  private updateGeographicDistribution(demographics: DemographicsData, attendeeData: any): void {
    const { country, region, city } = attendeeData.location;

    let countryData = demographics.geographicDistribution.countries.find(c => c.country === country);
    if (!countryData) {
      countryData = {
        country,
        countryCode: this.getCountryCode(country),
        count: 0,
        percentage: 0,
        revenue: 0,
        averageSpend: 0,
        conversionRate: 0,
      };
      demographics.geographicDistribution.countries.push(countryData);
    }
    countryData.count += 1;

    let regionData = demographics.geographicDistribution.regions.find(r => r.region === region);
    if (!regionData) {
      regionData = {
        region,
        count: 0,
        percentage: 0,
        revenue: 0,
        cities: [],
      };
      demographics.geographicDistribution.regions.push(regionData);
    }
    regionData.count += 1;

    let cityData = regionData.cities.find(c => c.city === city);
    if (!cityData) {
      cityData = { city, count: 0, percentage: 0, revenue: 0 };
      regionData.cities.push(cityData);
    }
    cityData.count += 1;
  }

  private updateIncomeDistribution(demographics: DemographicsData, attendeeData: any): void {
    const incomeBracket = this.getIncomeBracket(attendeeData.income);
    let bracketData = demographics.incomeDistribution.brackets.find(
      b => b.min <= attendeeData.income && b.max >= attendeeData.income
    );

    if (!bracketData) {
      bracketData = {
        min: incomeBracket.min,
        max: incomeBracket.max,
        count: 0,
        percentage: 0,
        revenue: 0,
        averageSpend: 0,
        ticketTierPreference: [],
      };
      demographics.incomeDistribution.brackets.push(bracketData);
    }

    bracketData.count += 1;
  }

  private updateEducationDistribution(demographics: DemographicsData, attendeeData: any): void {
    let educationData = demographics.educationDistribution.levels.find(e => e.level === attendeeData.education);

    if (!educationData) {
      educationData = {
        level: attendeeData.education,
        count: 0,
        percentage: 0,
        revenue: 0,
        averageSpend: 0,
      };
      demographics.educationDistribution.levels.push(educationData);
    }

    educationData.count += 1;
  }

  private updateOccupationDistribution(demographics: DemographicsData, attendeeData: any): void {
    const occupationCategory = this.categorizeOccupation(attendeeData.occupation);
    let categoryData = demographics.occupationDistribution.categories.find(c => c.category === occupationCategory);

    if (!categoryData) {
      categoryData = {
        category: occupationCategory,
        count: 0,
        percentage: 0,
        revenue: 0,
        averageSpend: 0,
        jobTitles: [],
      };
      demographics.occupationDistribution.categories.push(categoryData);
    }

    categoryData.count += 1;
  }

  private updateInterestsAndPreferences(demographics: DemographicsData, attendeeData: any): void {
    attendeeData.interests.forEach(interest => {
      const category = this.categorizeInterest(interest);
      let categoryData = demographics.interestsAndPreferences.categories.find(c => c.category === category);

      if (!categoryData) {
        categoryData = {
          category,
          count: 0,
          percentage: 0,
          engagement: 0,
          relatedEvents: [],
        };
        demographics.interestsAndPreferences.categories.push(categoryData);
      }

      categoryData.count += 1;
    });
  }

  private updateDeviceAndTechProfile(demographics: DemographicsData, attendeeData: any): void {
    const { type, os, browser } = attendeeData.deviceInfo;
    let deviceData = demographics.deviceAndTechProfile.devices.find(
      d => d.type === type && d.os === os && d.browser === browser
    );

    if (!deviceData) {
      deviceData = {
        type,
        brand: this.getBrandFromOS(os),
        model: '',
        os,
        browser,
        count: 0,
        percentage: 0,
        conversionRate: 0,
        averageSessionTime: 0,
      };
      demographics.deviceAndTechProfile.devices.push(deviceData);
    }

    deviceData.count += 1;
  }

  private updateBehavioralPatterns(demographics: DemographicsData, attendeeData: any): void {
    const timeOnSite = attendeeData.behaviorData.timeOnSite;
    if (timeOnSite < 60) {
      demographics.behavioralPatterns.decisionMakingSpeed.immediate += 1;
    } else if (timeOnSite < 300) {
      demographics.behavioralPatterns.decisionMakingSpeed.quick += 1;
    } else if (timeOnSite < 1800) {
      demographics.behavioralPatterns.decisionMakingSpeed.considered += 1;
    } else {
      demographics.behavioralPatterns.decisionMakingSpeed.deliberate += 1;
    }

    if (attendeeData.behaviorData.socialMediaActivity?.length > 0) {
      demographics.behavioralPatterns.socialInfluence.socialMediaInfluenced += 1;
    } else {
      demographics.behavioralPatterns.socialInfluence.independentDecision += 1;
    }
  }

  private async updateSegmentAnalysis(demographics: DemographicsData): Promise<void> {
    const segments = this.identifyPrimarySegments(demographics);
    demographics.segmentAnalysis.primarySegments = segments;
    demographics.segmentAnalysis.targetingRecommendations = this.generateTargetingRecommendations(segments);
  }

  async generateDemographicInsights(eventId: string, demographics: DemographicsData): Promise<DemographicInsight[]> {
    const insights: DemographicInsight[] = [];

    insights.push(...this.analyzeAgeDistribution(demographics.ageDistribution));
    insights.push(...this.analyzeGenderDistribution(demographics.genderDistribution));
    insights.push(...this.analyzeGeographicDistribution(demographics.geographicDistribution));
    insights.push(...this.analyzeBehavioralPatterns(demographics.behavioralPatterns));

    return insights.sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      return (impactWeight[b.impact] * b.confidence) - (impactWeight[a.impact] * a.confidence);
    });
  }

  private identifyPrimarySegments(demographics: DemographicsData): any[] {
    const segments = [];

    const youngProfessionals = this.calculateSegmentSize(demographics, {
      ageRange: [25, 35],
      education: ['bachelor', 'master'],
    });

    if (youngProfessionals.size > 0) {
      segments.push({
        segmentId: 'young_professionals',
        name: 'Young Professionals',
        size: youngProfessionals.size,
        percentage: youngProfessionals.percentage,
        revenue: 0,
        characteristics: ['Tech-savvy', 'High income', 'Social media active'],
        value: youngProfessionals.size * 1.5,
        growth: 0,
      });
    }

    return segments;
  }

  private calculateSegmentSize(demographics: DemographicsData, criteria: any): { size: number; percentage: number } {
    let matchingCount = 0;
    const totalSampleSize = demographics.totalSampleSize;

    if (criteria.ageRange) {
      const ageMatches = demographics.ageDistribution.ranges
        .filter(range => range.min >= criteria.ageRange[0] && range.max <= criteria.ageRange[1])
        .reduce((sum, range) => sum + range.count, 0);
      matchingCount = Math.max(matchingCount, ageMatches);
    }

    return {
      size: matchingCount,
      percentage: totalSampleSize > 0 ? (matchingCount / totalSampleSize) * 100 : 0,
    };
  }

  private generateTargetingRecommendations(segments: any[]): any[] {
    return segments.map(segment => ({
      segment: segment.name,
      strategy: this.getTargetingStrategy(segment),
      expectedROI: segment.value * 0.15,
      confidence: 0.8,
    }));
  }

  private getTargetingStrategy(segment: any): string {
    switch (segment.segmentId) {
      case 'young_professionals':
        return 'Digital-first marketing with LinkedIn and Instagram focus';
      default:
        return 'General audience targeting';
    }
  }

  private analyzeAgeDistribution(ageDistribution: any): DemographicInsight[] {
    const insights: DemographicInsight[] = [];

    if (ageDistribution.ranges.length > 0) {
      const dominantRange = ageDistribution.ranges.sort((a, b) => b.count - a.count)[0];
      
      if (dominantRange.percentage > 40) {
        insights.push({
          category: 'Age',
          insight: `${dominantRange.percentage.toFixed(1)}% of attendees are aged ${dominantRange.min}-${dominantRange.max}`,
          confidence: 0.9,
          impact: 'high',
          actionable: true,
          recommendations: [
            'Tailor marketing messages to this age group',
            'Consider age-appropriate event programming',
            'Optimize pricing for this demographic',
          ],
        });
      }
    }

    return insights;
  }

  private analyzeGenderDistribution(genderDistribution: any): DemographicInsight[] {
    const insights: DemographicInsight[] = [];

    if (genderDistribution.breakdown.length > 0) {
      const genderBalance = Math.abs(50 - genderDistribution.breakdown[0]?.percentage || 0);
      
      if (genderBalance > 20) {
        insights.push({
          category: 'Gender',
          insight: `Strong gender skew detected: ${genderDistribution.dominantGender} represents majority`,
          confidence: 0.85,
          impact: 'medium',
          actionable: true,
          recommendations: [
            'Consider targeted marketing to underrepresented gender',
            'Review event content for gender appeal',
            'Analyze competitor demographics',
          ],
        });
      }
    }

    return insights;
  }

  private analyzeGeographicDistribution(geoDistribution: any): DemographicInsight[] {
    const insights: DemographicInsight[] = [];

    if (geoDistribution.countries.length > 1) {
      const topCountry = geoDistribution.countries.sort((a, b) => b.count - a.count)[0];
      
      if (topCountry.percentage > 60) {
        insights.push({
          category: 'Geography',
          insight: `${topCountry.percentage.toFixed(1)}% of attendees are from ${topCountry.country}`,
          confidence: 0.9,
          impact: 'medium',
          actionable: true,
          recommendations: [
            'Focus marketing efforts in this region',
            'Consider local partnerships',
            'Optimize event timing for this timezone',
          ],
        });
      }
    }

    return insights;
  }

  private analyzeBehavioralPatterns(behavioralPatterns: any): DemographicInsight[] {
    const insights: DemographicInsight[] = [];

    const totalDecisions = Object.values(behavioralPatterns.decisionMakingSpeed).reduce((sum: number, val: any) => sum + val, 0);
    
    if (totalDecisions > 0) {
      const immediatePercentage = (behavioralPatterns.decisionMakingSpeed.immediate / totalDecisions) * 100;
      
      if (immediatePercentage > 50) {
        insights.push({
          category: 'Behavior',
          insight: `${immediatePercentage.toFixed(1)}% of attendees make immediate purchase decisions`,
          confidence: 0.8,
          impact: 'high',
          actionable: true,
          recommendations: [
            'Optimize for mobile conversion',
            'Implement urgency messaging',
            'Streamline checkout process',
          ],
        });
      }
    }

    return insights;
  }

  private identifyTrendingSegments(demographics: DemographicsData): any[] {
    return demographics.segmentAnalysis.primarySegments
      .filter(segment => segment.growth > 10)
      .sort((a, b) => b.growth - a.growth);
  }

  private identifyMarketOpportunities(demographics: DemographicsData): any[] {
    return demographics.segmentAnalysis.primarySegments
      .filter(segment => segment.value > 100)
      .map(segment => ({
        type: 'high_value_segment',
        segment: segment.name,
        opportunity: `Expand reach to ${segment.name} segment`,
        potential: segment.value,
      }));
  }

  private getAgeRange(age: number): { min: number; max: number } {
    if (age < 25) return { min: 18, max: 24 };
    if (age < 35) return { min: 25, max: 34 };
    if (age < 45) return { min: 35, max: 44 };
    if (age < 55) return { min: 45, max: 54 };
    return { min: 55, max: 64 };
  }

  private getIncomeBracket(income: number): { min: number; max: number } {
    if (income < 30000) return { min: 0, max: 30000 };
    if (income < 50000) return { min: 30000, max: 50000 };
    if (income < 75000) return { min: 50000, max: 75000 };
    if (income < 100000) return { min: 75000, max: 100000 };
    return { min: 100000, max: 999999 };
  }

  private categorizeOccupation(occupation: string): string {
    const tech = ['developer', 'engineer', 'programmer', 'analyst'];
    const finance = ['banker', 'accountant', 'financial', 'investment'];
    const healthcare = ['doctor', 'nurse', 'medical', 'healthcare'];
    
    const lower = occupation.toLowerCase();
    if (tech.some(term => lower.includes(term))) return 'technology';
    if (finance.some(term => lower.includes(term))) return 'finance';
    if (healthcare.some(term => lower.includes(term))) return 'healthcare';
    return 'other';
  }

  private categorizeInterest(interest: string): string {
    const music = ['music', 'concert', 'band', 'artist'];
    const sports = ['sports', 'football', 'basketball', 'soccer'];
    const tech = ['technology', 'gaming', 'software', 'ai'];
    
    const lower = interest.toLowerCase();
    if (music.some(term => lower.includes(term))) return 'music';
    if (sports.some(term => lower.includes(term))) return 'sports';
    if (tech.some(term => lower.includes(term))) return 'technology';
    return 'other';
  }

  private getBrandFromOS(os: string): string {
    if (os.toLowerCase().includes('ios')) return 'Apple';
    if (os.toLowerCase().includes('android')) return 'Google';
    if (os.toLowerCase().includes('windows')) return 'Microsoft';
    return 'Unknown';
  }

  private getCountryCode(country: string): string {
    const codes = {
      'United States': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      'Germany': 'DE',
      'France': 'FR',
    };
    return codes[country] || 'XX';
  }

  private calculateConfidenceLevel(sampleSize: number): number {
    if (sampleSize > 1000) return 95;
    if (sampleSize > 500) return 90;
    if (sampleSize > 100) return 85;
    return 80;
  }

  private calculateMarginOfError(sampleSize: number): number {
    if (sampleSize > 1000) return 3;
    if (sampleSize > 500) return 4;
    if (sampleSize > 100) return 5;
    return 10;
  }

  private calculateMedian(values: number[]): number {
    const sorted = values.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculateDiversityIndex(percentages: number[]): number {
    return percentages.reduce((entropy, p) => {
      const prob = p / 100;
      return prob > 0 ? entropy - (prob * Math.log2(prob)) : entropy;
    }, 0);
  }

  private recalculateAgePercentages(demographics: DemographicsData): void {
    const totalCount = demographics.ageDistribution.ranges.reduce((sum, range) => sum + range.count, 0);
    demographics.ageDistribution.ranges.forEach(range => {
      range.percentage = totalCount > 0 ? (range.count / totalCount) * 100 : 0;
    });
    
    demographics.ageDistribution.dominantRange = demographics.ageDistribution.ranges
      .sort((a, b) => b.count - a.count)[0]?.min + '-' + 
      demographics.ageDistribution.ranges.sort((a, b) => b.count - a.count)[0]?.max || '';
  }

  private recalculateGenderPercentages(demographics: DemographicsData): void {
    const totalCount = demographics.genderDistribution.breakdown.reduce((sum, gender) => sum + gender.count, 0);
    demographics.genderDistribution.breakdown.forEach(gender => {
      gender.percentage = totalCount > 0 ? (gender.count / totalCount) * 100 : 0;
    });

    demographics.genderDistribution.dominantGender = demographics.genderDistribution.breakdown
      .sort((a, b) => b.count - a.count)[0]?.gender || '';

    demographics.genderDistribution.diversityIndex = this.calculateDiversityIndex(
      demographics.genderDistribution.breakdown.map(g => g.percentage)
    );
  }

  private getEmptyDemographics() {
    return {
      demographics: null,
      insights: [],
      trendingSegments: [],
      marketOpportunities: [],
      qualityScore: 0,
      lastUpdated: new Date(),
    };
  }
}

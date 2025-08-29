import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyticsWebSocketGateway, AnalyticsUpdate } from '../gateways/analytics-websocket.gateway';
import { EventAnalytics } from '../entities/event-analytics.entity';
import { TicketSalesMetrics } from '../entities/ticket-sales-metrics.entity';
import { DemographicsData } from '../entities/demographics-data.entity';
import { SentimentAnalysis } from '../entities/sentiment-analysis.entity';
import { RevenueProjection } from '../entities/revenue-projection.entity';

export interface StreamingConfig {
  batchSize: number;
  flushInterval: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  enableCompression: boolean;
  enableBuffering: boolean;
}

export interface DataPoint {
  eventId: string;
  type: 'ticket_sale' | 'refund' | 'visitor' | 'social_mention' | 'demographic_update';
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class RealTimeStreamingService {
  private readonly logger = new Logger(RealTimeStreamingService.name);
  private readonly config: StreamingConfig;
  private dataBuffer = new Map<string, DataPoint[]>(); // eventId -> DataPoint[]
  private flushTimers = new Map<string, NodeJS.Timeout>();
  private processingQueues = new Map<string, boolean>(); // eventId -> isProcessing

  constructor(
    @InjectRepository(EventAnalytics)
    private eventAnalyticsRepository: Repository<EventAnalytics>,
    @InjectRepository(TicketSalesMetrics)
    private ticketSalesRepository: Repository<TicketSalesMetrics>,
    @InjectRepository(DemographicsData)
    private demographicsRepository: Repository<DemographicsData>,
    @InjectRepository(SentimentAnalysis)
    private sentimentRepository: Repository<SentimentAnalysis>,
    @InjectRepository(RevenueProjection)
    private revenueProjectionRepository: Repository<RevenueProjection>,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private analyticsGateway: AnalyticsWebSocketGateway,
  ) {
    this.config = {
      batchSize: this.configService.get<number>('ANALYTICS_BATCH_SIZE', 100),
      flushInterval: this.configService.get<number>('ANALYTICS_FLUSH_INTERVAL', 5000),
      maxRetries: this.configService.get<number>('ANALYTICS_MAX_RETRIES', 3),
      retryDelay: this.configService.get<number>('ANALYTICS_RETRY_DELAY', 1000),
      enableCompression: this.configService.get<boolean>('ANALYTICS_COMPRESSION', true),
      enableBuffering: this.configService.get<boolean>('ANALYTICS_BUFFERING', true),
    };

    this.setupEventListeners();
  }

  async ingestDataPoint(dataPoint: DataPoint): Promise<void> {
    try {
      const { eventId } = dataPoint;

      // Add to buffer
      if (!this.dataBuffer.has(eventId)) {
        this.dataBuffer.set(eventId, []);
      }
      
      this.dataBuffer.get(eventId).push(dataPoint);

      // Process immediately for critical priority
      if (dataPoint.priority === 'critical') {
        await this.processEventData(eventId, true);
        return;
      }

      // Check if we should flush based on batch size
      if (this.dataBuffer.get(eventId).length >= this.config.batchSize) {
        await this.processEventData(eventId);
        return;
      }

      // Set up flush timer if not already set
      if (!this.flushTimers.has(eventId)) {
        const timer = setTimeout(() => {
          this.processEventData(eventId);
        }, this.config.flushInterval);
        
        this.flushTimers.set(eventId, timer);
      }

    } catch (error) {
      this.logger.error(`Failed to ingest data point for event ${dataPoint.eventId}:`, error);
      throw error;
    }
  }

  async processEventData(eventId: string, immediate = false): Promise<void> {
    // Prevent concurrent processing for the same event
    if (this.processingQueues.get(eventId)) {
      return;
    }

    try {
      this.processingQueues.set(eventId, true);

      const dataPoints = this.dataBuffer.get(eventId) || [];
      if (dataPoints.length === 0) {
        return;
      }

      // Clear buffer and timer
      this.dataBuffer.set(eventId, []);
      const timer = this.flushTimers.get(eventId);
      if (timer) {
        clearTimeout(timer);
        this.flushTimers.delete(eventId);
      }

      this.logger.debug(`Processing ${dataPoints.length} data points for event ${eventId}`);

      // Group data points by type
      const groupedData = this.groupDataPointsByType(dataPoints);

      // Process each type
      const updates: AnalyticsUpdate[] = [];

      if (groupedData.ticket_sale.length > 0 || groupedData.refund.length > 0) {
        const salesUpdate = await this.processTicketSalesData(eventId, groupedData);
        if (salesUpdate) updates.push(salesUpdate);
      }

      if (groupedData.visitor.length > 0) {
        const demographicsUpdate = await this.processDemographicsData(eventId, groupedData);
        if (demographicsUpdate) updates.push(demographicsUpdate);
      }

      if (groupedData.social_mention.length > 0) {
        const sentimentUpdate = await this.processSentimentData(eventId, groupedData);
        if (sentimentUpdate) updates.push(sentimentUpdate);
      }

      if (groupedData.demographic_update.length > 0) {
        const demographicsUpdate = await this.processDemographicsData(eventId, groupedData);
        if (demographicsUpdate) updates.push(demographicsUpdate);
      }

      // Update overall event analytics
      await this.updateEventAnalytics(eventId, dataPoints);

      // Generate revenue projections if significant data changes
      if (this.shouldUpdateProjections(dataPoints)) {
        const revenueUpdate = await this.updateRevenueProjections(eventId);
        if (revenueUpdate) updates.push(revenueUpdate);
      }

      // Broadcast updates via WebSocket
      for (const update of updates) {
        await this.analyticsGateway.broadcastAnalyticsUpdate(update);
      }

      // Emit events for other services
      this.eventEmitter.emit('analytics.updated', {
        eventId,
        dataPointsProcessed: dataPoints.length,
        updates: updates.map(u => u.type),
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`Failed to process event data for ${eventId}:`, error);
      
      // Retry logic
      await this.retryProcessing(eventId, error);
      
    } finally {
      this.processingQueues.set(eventId, false);
    }
  }

  private groupDataPointsByType(dataPoints: DataPoint[]) {
    return dataPoints.reduce((groups, point) => {
      if (!groups[point.type]) {
        groups[point.type] = [];
      }
      groups[point.type].push(point);
      return groups;
    }, {
      ticket_sale: [],
      refund: [],
      visitor: [],
      social_mention: [],
      demographic_update: [],
    } as Record<string, DataPoint[]>);
  }

  private async processTicketSalesData(
    eventId: string,
    groupedData: any,
  ): Promise<AnalyticsUpdate | null> {
    try {
      const salesData = [...groupedData.ticket_sale, ...groupedData.refund];
      
      // Aggregate sales metrics
      const metrics = this.aggregateTicketSalesMetrics(salesData);
      
      // Get or create current metrics record
      let currentMetrics = await this.ticketSalesRepository.findOne({
        where: {
          eventId,
          metricType: 'real_time',
          timestamp: new Date(new Date().setMinutes(0, 0, 0)), // Current hour
        },
      });

      if (!currentMetrics) {
        currentMetrics = this.ticketSalesRepository.create({
          eventId,
          metricType: 'real_time',
          timestamp: new Date(),
          ...metrics,
        });
      } else {
        // Update existing metrics
        Object.assign(currentMetrics, metrics);
      }

      await this.ticketSalesRepository.save(currentMetrics);

      return {
        type: 'ticket_sales',
        eventId,
        timestamp: new Date(),
        data: currentMetrics,
        priority: 'medium',
      };

    } catch (error) {
      this.logger.error(`Failed to process ticket sales data for ${eventId}:`, error);
      return null;
    }
  }

  private async processDemographicsData(
    eventId: string,
    groupedData: any,
  ): Promise<AnalyticsUpdate | null> {
    try {
      const demographicsData = [...groupedData.visitor, ...groupedData.demographic_update];
      
      // Aggregate demographics
      const demographics = this.aggregateDemographicsData(demographicsData);
      
      // Get or create current demographics record
      let currentDemographics = await this.demographicsRepository.findOne({
        where: {
          eventId,
          category: 'behavior',
          timestamp: new Date(new Date().setHours(0, 0, 0, 0)), // Today
        },
      });

      if (!currentDemographics) {
        currentDemographics = this.demographicsRepository.create({
          eventId,
          category: 'behavior',
          timestamp: new Date(),
          ...demographics,
        });
      } else {
        // Update existing demographics
        Object.assign(currentDemographics, demographics);
      }

      await this.demographicsRepository.save(currentDemographics);

      return {
        type: 'demographics',
        eventId,
        timestamp: new Date(),
        data: currentDemographics,
        priority: 'low',
      };

    } catch (error) {
      this.logger.error(`Failed to process demographics data for ${eventId}:`, error);
      return null;
    }
  }

  private async processSentimentData(
    eventId: string,
    groupedData: any,
  ): Promise<AnalyticsUpdate | null> {
    try {
      const sentimentData = groupedData.social_mention;
      
      // Aggregate sentiment metrics
      const sentiment = this.aggregateSentimentData(sentimentData);
      
      // Get or create current sentiment record
      let currentSentiment = await this.sentimentRepository.findOne({
        where: {
          eventId,
          platform: 'twitter', // Default platform, would be dynamic
          timestamp: new Date(new Date().setHours(0, 0, 0, 0)), // Today
        },
      });

      if (!currentSentiment) {
        currentSentiment = this.sentimentRepository.create({
          eventId,
          platform: 'twitter',
          timestamp: new Date(),
          ...sentiment,
        });
      } else {
        // Update existing sentiment
        Object.assign(currentSentiment, sentiment);
      }

      await this.sentimentRepository.save(currentSentiment);

      return {
        type: 'sentiment',
        eventId,
        timestamp: new Date(),
        data: currentSentiment,
        priority: 'medium',
      };

    } catch (error) {
      this.logger.error(`Failed to process sentiment data for ${eventId}:`, error);
      return null;
    }
  }

  private async updateEventAnalytics(eventId: string, dataPoints: DataPoint[]): Promise<void> {
    try {
      // Get or create event analytics record
      let analytics = await this.eventAnalyticsRepository.findOne({
        where: { eventId, isActive: true },
        order: { timestamp: 'DESC' },
      });

      if (!analytics) {
        analytics = this.eventAnalyticsRepository.create({
          eventId,
          organizerId: 'temp', // Would be fetched from event data
          timestamp: new Date(),
          ticketSalesMetrics: {},
          attendeeDemographics: {},
          socialMediaMetrics: {},
          revenueProjections: {},
          performanceComparison: {},
          alerts: [],
          recommendations: [],
          customMetrics: {},
        });
      }

      // Update data points count
      analytics.dataPoints += dataPoints.length;
      analytics.lastCalculatedAt = new Date();

      await this.eventAnalyticsRepository.save(analytics);

    } catch (error) {
      this.logger.error(`Failed to update event analytics for ${eventId}:`, error);
    }
  }

  private async updateRevenueProjections(eventId: string): Promise<AnalyticsUpdate | null> {
    try {
      // This would integrate with ML models for revenue forecasting
      // For now, return a placeholder update
      
      return {
        type: 'revenue',
        eventId,
        timestamp: new Date(),
        data: {
          projectedRevenue: 0,
          confidence: 0.85,
          lastUpdated: new Date(),
        },
        priority: 'medium',
      };

    } catch (error) {
      this.logger.error(`Failed to update revenue projections for ${eventId}:`, error);
      return null;
    }
  }

  private shouldUpdateProjections(dataPoints: DataPoint[]): boolean {
    // Update projections if we have significant ticket sales or high-priority data
    return dataPoints.some(point => 
      point.type === 'ticket_sale' || 
      point.priority === 'high' || 
      point.priority === 'critical'
    );
  }

  private aggregateTicketSalesMetrics(dataPoints: DataPoint[]) {
    // Aggregate ticket sales data
    const totalSales = dataPoints
      .filter(p => p.type === 'ticket_sale')
      .reduce((sum, p) => sum + (p.data.quantity || 1), 0);
    
    const totalRevenue = dataPoints
      .filter(p => p.type === 'ticket_sale')
      .reduce((sum, p) => sum + (p.data.amount || 0), 0);

    const refunds = dataPoints
      .filter(p => p.type === 'refund')
      .reduce((sum, p) => sum + (p.data.quantity || 1), 0);

    return {
      ticketsSold: totalSales,
      revenue: totalRevenue,
      refunds,
      tierBreakdown: [],
      geographicBreakdown: [],
      deviceBreakdown: [],
      paymentMethodBreakdown: [],
      promotionalCodeUsage: [],
      salesFunnel: {
        visitors: 0,
        eventViews: 0,
        ticketViews: 0,
        cartAdditions: 0,
        checkoutStarts: 0,
        purchases: totalSales,
        conversionRates: {
          visitorToView: 0,
          viewToCart: 0,
          cartToCheckout: 0,
          checkoutToPurchase: 0,
          overallConversion: 0,
        },
      },
      velocityMetrics: {
        salesPerHour: totalSales,
        revenuePerHour: totalRevenue,
        peakSalesHour: new Date().getHours().toString(),
        slowestSalesHour: new Date().getHours().toString(),
        averageTimeBetweenSales: 0,
        salesAcceleration: 0,
      },
      customerBehavior: {
        averageTimeOnSite: 0,
        averageTicketsPerPurchase: totalSales > 0 ? totalSales / dataPoints.filter(p => p.type === 'ticket_sale').length : 0,
        repeatPurchaseRate: 0,
        abandonmentRate: 0,
        averageDecisionTime: 0,
        mobileVsDesktopPreference: {
          mobile: 0,
          desktop: 0,
          tablet: 0,
        },
      },
      marketingAttribution: [],
    };
  }

  private aggregateDemographicsData(dataPoints: DataPoint[]) {
    // Aggregate demographics data
    return {
      ageDistribution: {
        ranges: [],
        averageAge: 0,
        medianAge: 0,
        dominantRange: '',
        trends: {
          growingSegments: [],
          decliningSegments: [],
        },
      },
      genderDistribution: {
        breakdown: [],
        dominantGender: '',
        diversityIndex: 0,
        trends: {
          growingSegments: [],
          decliningSegments: [],
        },
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
        purchasingPower: {
          high: 0,
          medium: 0,
          low: 0,
        },
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
        techSavviness: {
          high: 0,
          medium: 0,
          low: 0,
        },
        appUsage: [],
        socialMediaPresence: [],
      },
      behavioralPatterns: {
        purchaseTimings: [],
        decisionMakingSpeed: {
          immediate: 0,
          quick: 0,
          considered: 0,
          deliberate: 0,
        },
        pricesensitivity: {
          low: 0,
          medium: 0,
          high: 0,
        },
        loyaltyIndicators: {
          repeatAttendees: 0,
          brandFollowers: 0,
          referralMakers: 0,
        },
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
      totalSampleSize: dataPoints.length,
      confidenceLevel: 95,
      marginOfError: 5,
      lastUpdated: new Date(),
    };
  }

  private aggregateSentimentData(dataPoints: DataPoint[]) {
    // Aggregate sentiment data
    const totalMentions = dataPoints.length;
    const avgSentiment = dataPoints.reduce((sum, p) => sum + (p.data.sentiment || 0), 0) / totalMentions;

    return {
      sentimentType: avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral',
      sentimentScore: avgSentiment,
      confidenceScore: 0.8,
      overallMetrics: {
        totalMentions,
        totalReach: dataPoints.reduce((sum, p) => sum + (p.data.reach || 0), 0),
        totalEngagement: dataPoints.reduce((sum, p) => sum + (p.data.engagement || 0), 0),
        averageSentiment: avgSentiment,
        sentimentDistribution: {
          positive: dataPoints.filter(p => (p.data.sentiment || 0) > 0.1).length / totalMentions,
          negative: dataPoints.filter(p => (p.data.sentiment || 0) < -0.1).length / totalMentions,
          neutral: dataPoints.filter(p => Math.abs(p.data.sentiment || 0) <= 0.1).length / totalMentions,
          mixed: 0,
        },
        viralityScore: 0,
        trendingScore: 0,
        influenceScore: 0,
      },
      platformBreakdown: [],
      keywordAnalysis: {
        positiveKeywords: [],
        negativeKeywords: [],
        emergingKeywords: [],
        brandMentions: [],
      },
      influencerAnalysis: {
        topInfluencers: [],
        influencerSentiment: {
          positive: 0,
          negative: 0,
          neutral: 0,
        },
        potentialPartners: [],
      },
      emotionAnalysis: {
        emotions: [],
        dominantEmotion: '',
        emotionalJourney: [],
      },
      topicAnalysis: {
        topics: [],
        trendingTopics: [],
        controversialTopics: [],
      },
      geographicSentiment: {
        regions: [],
        sentimentHeatmap: [],
        regionalTrends: [],
      },
      temporalAnalysis: {
        hourlyTrends: [],
        dailyTrends: [],
        sentimentVelocity: 0,
        peakSentimentTime: new Date(),
        lowestSentimentTime: new Date(),
        volatility: 0,
      },
      competitorComparison: {
        competitors: [],
        marketPosition: {
          rank: 0,
          sentimentRank: 0,
          shareOfVoice: 0,
          competitiveAdvantage: [],
        },
      },
      alertsAndInsights: {
        criticalAlerts: [],
        insights: [],
        recommendations: [],
      },
      contentAnalysis: {
        contentTypes: [],
        topPerformingContent: [],
        contentGaps: [],
      },
      totalDataPoints: totalMentions,
      lastAnalyzedAt: new Date(),
    };
  }

  private async retryProcessing(eventId: string, error: Error, attempt = 1): Promise<void> {
    if (attempt > this.config.maxRetries) {
      this.logger.error(`Max retries exceeded for event ${eventId}:`, error);
      return;
    }

    this.logger.warn(`Retrying processing for event ${eventId} (attempt ${attempt})`);
    
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
    
    try {
      await this.processEventData(eventId);
    } catch (retryError) {
      await this.retryProcessing(eventId, retryError, attempt + 1);
    }
  }

  // Public methods for external services
  async getStreamingHealth() {
    return {
      status: 'healthy',
      bufferedEvents: this.dataBuffer.size,
      activeTimers: this.flushTimers.size,
      processingQueues: Array.from(this.processingQueues.entries())
        .filter(([, isProcessing]) => isProcessing).length,
      config: this.config,
      timestamp: new Date(),
    };
  }

  async flushAllBuffers(): Promise<void> {
    const eventIds = Array.from(this.dataBuffer.keys());
    
    await Promise.all(
      eventIds.map(eventId => this.processEventData(eventId, true))
    );
  }

  async clearEventBuffer(eventId: string): Promise<void> {
    this.dataBuffer.delete(eventId);
    
    const timer = this.flushTimers.get(eventId);
    if (timer) {
      clearTimeout(timer);
      this.flushTimers.delete(eventId);
    }
  }

  private setupEventListeners(): void {
    // Listen for external events that should trigger analytics updates
    this.eventEmitter.on('ticket.purchased', (data) => {
      this.ingestDataPoint({
        eventId: data.eventId,
        type: 'ticket_sale',
        timestamp: new Date(),
        data: data,
        priority: 'medium',
      });
    });

    this.eventEmitter.on('ticket.refunded', (data) => {
      this.ingestDataPoint({
        eventId: data.eventId,
        type: 'refund',
        timestamp: new Date(),
        data: data,
        priority: 'medium',
      });
    });

    this.eventEmitter.on('user.visited', (data) => {
      this.ingestDataPoint({
        eventId: data.eventId,
        type: 'visitor',
        timestamp: new Date(),
        data: data,
        priority: 'low',
      });
    });

    this.eventEmitter.on('social.mention', (data) => {
      this.ingestDataPoint({
        eventId: data.eventId,
        type: 'social_mention',
        timestamp: new Date(),
        data: data,
        priority: data.sentiment < -0.5 ? 'high' : 'low',
      });
    });
  }
}

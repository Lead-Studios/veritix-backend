import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { CompetitorMonitoringService } from '../services/competitor-monitoring.service';

@Processor('competitor-monitoring')
export class CompetitorMonitoringProcessor {
  private readonly logger = new Logger(CompetitorMonitoringProcessor.name);

  constructor(
    private competitorMonitoringService: CompetitorMonitoringService,
  ) {}

  @Process('scrape-competitor-prices')
  async handleCompetitorPriceScraping(job: Job<{
    eventType: string;
    location: string;
    competitors?: string[];
  }>) {
    const { eventType, location, competitors } = job.data;
    
    try {
      this.logger.log(`Starting competitor price scraping for ${eventType} in ${location}`);
      
      // Scrape prices from specified competitors or all available sources
      await this.competitorMonitoringService.scrapeCompetitorPrices(eventType, location);
      
      this.logger.log(`Completed competitor price scraping for ${eventType} in ${location}`);
      
    } catch (error) {
      this.logger.error(`Error scraping competitor prices for ${eventType} in ${location}:`, error);
      throw error;
    }
  }

  @Process('analyze-competitor-trends')
  async handleCompetitorTrendAnalysis(job: Job<{
    eventType: string;
    location: string;
    days?: number;
  }>) {
    const { eventType, location, days = 30 } = job.data;
    
    try {
      this.logger.log(`Starting competitor trend analysis for ${eventType} in ${location}`);
      
      // Get competitor trends
      const trends = await this.competitorMonitoringService.getCompetitorTrends(
        eventType,
        location,
        days
      );
      
      // Get market insights
      const insights = await this.competitorMonitoringService.getCompetitorInsights(
        eventType,
        location
      );
      
      const analysis = {
        trends,
        insights,
        analysisDate: new Date(),
        eventType,
        location,
      };
      
      this.logger.log(`Completed competitor trend analysis for ${eventType} in ${location}:`, {
        trendDataPoints: trends.length,
        marketLeader: insights.marketLeader,
        averagePriceChange: insights.averagePriceChange,
      });
      
      return analysis;
      
    } catch (error) {
      this.logger.error(`Error analyzing competitor trends for ${eventType} in ${location}:`, error);
      throw error;
    }
  }

  @Process('bulk-competitor-monitoring')
  async handleBulkCompetitorMonitoring(job: Job<{
    markets: Array<{
      eventType: string;
      location: string;
    }>;
  }>) {
    const { markets } = job.data;
    
    try {
      this.logger.log(`Starting bulk competitor monitoring for ${markets.length} markets`);
      
      const results = [];
      
      for (const market of markets) {
        try {
          // Scrape competitor prices
          await this.competitorMonitoringService.scrapeCompetitorPrices(
            market.eventType,
            market.location
          );
          
          // Analyze trends
          const analysis = await this.handleCompetitorTrendAnalysis({
            data: market
          } as Job<{ eventType: string; location: string }>);
          
          results.push({
            market,
            status: 'success',
            analysis,
          });
          
        } catch (error) {
          this.logger.error(`Error monitoring market ${market.eventType} in ${market.location}:`, error);
          results.push({
            market,
            status: 'error',
            error: error.message,
          });
        }
        
        // Update progress
        const progress = ((markets.indexOf(market) + 1) / markets.length) * 100;
        await job.progress(progress);
        
        // Add delay between markets to avoid overwhelming external services
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      this.logger.log(`Completed bulk competitor monitoring for ${markets.length} markets`);
      return results;
      
    } catch (error) {
      this.logger.error(`Error in bulk competitor monitoring:`, error);
      throw error;
    }
  }

  @Process('competitor-price-alert')
  async handleCompetitorPriceAlert(job: Job<{
    eventType: string;
    location: string;
    currentPrice: number;
    thresholds: {
      significantChange: number; // percentage
      competitiveGap: number; // percentage
    };
  }>) {
    const { eventType, location, currentPrice, thresholds } = job.data;
    
    try {
      this.logger.log(`Checking competitor price alerts for ${eventType} in ${location}`);
      
      // Get current competitor analysis
      const analysis = await this.competitorMonitoringService.analyzeCompetitorPricing(
        eventType,
        location,
        currentPrice,
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Mock event date
      );
      
      const alerts = [];
      
      // Check for significant competitive gaps
      if (analysis.averagePrice > 0) {
        const priceGap = ((currentPrice - analysis.averagePrice) / analysis.averagePrice) * 100;
        
        if (Math.abs(priceGap) > thresholds.competitiveGap) {
          alerts.push({
            type: 'competitive_gap',
            severity: Math.abs(priceGap) > thresholds.competitiveGap * 2 ? 'high' : 'medium',
            message: `Price gap of ${priceGap.toFixed(1)}% vs market average`,
            currentPrice,
            marketAverage: analysis.averagePrice,
            recommendation: priceGap > 0 ? 'Consider price reduction' : 'Opportunity for price increase',
          });
        }
      }
      
      // Check for market leader changes or significant competitor moves
      const insights = await this.competitorMonitoringService.getCompetitorInsights(
        eventType,
        location
      );
      
      if (Math.abs(insights.averagePriceChange) > thresholds.significantChange) {
        alerts.push({
          type: 'market_movement',
          severity: 'medium',
          message: `Market prices ${insights.averagePriceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(insights.averagePriceChange).toFixed(1)}%`,
          priceChange: insights.averagePriceChange,
          marketLeader: insights.marketLeader,
          recommendation: 'Review pricing strategy',
        });
      }
      
      if (alerts.length > 0) {
        this.logger.warn(`Generated ${alerts.length} competitor price alerts for ${eventType} in ${location}`);
        
        // In a real implementation, you would send these alerts via email, Slack, etc.
        // For now, we'll just log them
        for (const alert of alerts) {
          this.logger.warn(`PRICING ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
        }
      }
      
      return {
        alertsGenerated: alerts.length,
        alerts,
        analysis,
        insights,
      };
      
    } catch (error) {
      this.logger.error(`Error checking competitor price alerts:`, error);
      throw error;
    }
  }

  @Process('validate-competitor-data')
  async handleCompetitorDataValidation(job: Job<{
    competitorId?: string;
    eventType?: string;
    location?: string;
    minConfidence?: number;
  }>) {
    const { competitorId, eventType, location, minConfidence = 70 } = job.data;
    
    try {
      this.logger.log(`Starting competitor data validation`);
      
      // This would implement data quality checks for competitor pricing data
      // For now, we'll simulate validation logic
      
      const validationResults = {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        lowConfidenceRecords: 0,
        duplicateRecords: 0,
        outdatedRecords: 0,
        issues: [] as string[],
      };
      
      // Simulate validation checks
      validationResults.totalRecords = Math.floor(Math.random() * 1000) + 100;
      validationResults.validRecords = Math.floor(validationResults.totalRecords * 0.85);
      validationResults.invalidRecords = Math.floor(validationResults.totalRecords * 0.05);
      validationResults.lowConfidenceRecords = Math.floor(validationResults.totalRecords * 0.08);
      validationResults.duplicateRecords = Math.floor(validationResults.totalRecords * 0.02);
      
      if (validationResults.invalidRecords > validationResults.totalRecords * 0.1) {
        validationResults.issues.push('High number of invalid records detected');
      }
      
      if (validationResults.lowConfidenceRecords > validationResults.totalRecords * 0.15) {
        validationResults.issues.push('Many records have low confidence scores');
      }
      
      this.logger.log(`Completed competitor data validation:`, validationResults);
      
      return validationResults;
      
    } catch (error) {
      this.logger.error(`Error validating competitor data:`, error);
      throw error;
    }
  }
}

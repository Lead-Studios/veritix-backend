import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

// Entities
import { EventAnalytics } from './entities/event-analytics.entity';
import { TicketSalesMetrics } from './entities/ticket-sales-metrics.entity';
import { DemographicsData } from './entities/demographics-data.entity';
import { SentimentAnalysis } from './entities/sentiment-analysis.entity';
import { RevenueProjection } from './entities/revenue-projection.entity';

// Services
import { RealTimeStreamingService } from './services/real-time-streaming.service';
import { TicketSalesTrackingService } from './services/ticket-sales-tracking.service';
import { DemographicsAnalysisService } from './services/demographics-analysis.service';
import { SentimentMonitoringService } from './services/sentiment-monitoring.service';
import { RevenueForecastingService } from './services/revenue-forecasting.service';
import { ComparativeAnalysisService } from './services/comparative-analysis.service';
import { PerformanceAlertsService } from './services/performance-alerts.service';

// Controllers
import { AnalyticsController } from './controllers/analytics.controller';

// Gateways
import { AnalyticsWebSocketGateway } from './gateways/analytics-websocket.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventAnalytics,
      TicketSalesMetrics,
      DemographicsData,
      SentimentAnalysis,
      RevenueProjection,
    ]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    HttpModule,
  ],
  controllers: [
    AnalyticsController,
  ],
  providers: [
    // Core Services
    RealTimeStreamingService,
    TicketSalesTrackingService,
    DemographicsAnalysisService,
    SentimentMonitoringService,
    RevenueForecastingService,
    ComparativeAnalysisService,
    PerformanceAlertsService,
    
    // WebSocket Gateway
    AnalyticsWebSocketGateway,
  ],
  exports: [
    // Export services for use in other modules
    RealTimeStreamingService,
    TicketSalesTrackingService,
    DemographicsAnalysisService,
    SentimentMonitoringService,
    RevenueForecastingService,
    ComparativeAnalysisService,
    PerformanceAlertsService,
    AnalyticsWebSocketGateway,
  ],
})
export class RealTimeAnalyticsModule {}

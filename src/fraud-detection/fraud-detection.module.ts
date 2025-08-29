import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Entities
import { FraudCase } from './entities/fraud-case.entity';
import { BehavioralPattern } from './entities/behavioral-pattern.entity';
import { DeviceFingerprint } from './entities/device-fingerprint.entity';
import { RiskScore } from './entities/risk-score.entity';

// Services
import { BehavioralAnalysisService } from './services/behavioral-analysis.service';
import { DeviceFingerprintingService } from './services/device-fingerprinting.service';
import { TransactionMonitoringService } from './services/transaction-monitoring.service';
import { AccountFlaggingService } from './services/account-flagging.service';
import { ExternalFraudIntegrationService } from './services/external-fraud-integration.service';
import { FraudAnalyticsService } from './services/fraud-analytics.service';
import { PaymentProcessorIntegrationService } from './services/payment-processor-integration.service';

// Controllers
import { FraudDetectionController } from './controllers/fraud-detection.controller';
import { FraudAnalyticsController } from './controllers/fraud-analytics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FraudCase,
      BehavioralPattern,
      DeviceFingerprint,
      RiskScore,
    ]),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [
    BehavioralAnalysisService,
    DeviceFingerprintingService,
    TransactionMonitoringService,
    AccountFlaggingService,
    ExternalFraudIntegrationService,
    FraudAnalyticsService,
    PaymentProcessorIntegrationService,
  ],
  controllers: [
    FraudDetectionController,
    FraudAnalyticsController,
  ],
  exports: [
    BehavioralAnalysisService,
    DeviceFingerprintingService,
    TransactionMonitoringService,
    AccountFlaggingService,
    ExternalFraudIntegrationService,
    FraudAnalyticsService,
    PaymentProcessorIntegrationService,
  ],
})
export class FraudDetectionModule {}

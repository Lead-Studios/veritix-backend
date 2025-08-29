import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransactionMonitoringService, TransactionData, MonitoringResult } from '../services/transaction-monitoring.service';
import { BehavioralAnalysisService, UserBehaviorData, BehavioralAnalysisResult } from '../services/behavioral-analysis.service';
import { DeviceFingerprintingService, DeviceFingerprintData, DeviceRiskAssessment } from '../services/device-fingerprinting.service';
import { AccountFlaggingService, AccountFlagData, ReviewCase } from '../services/account-flagging.service';
import { ExternalFraudIntegrationService, FraudDatabaseQuery } from '../services/external-fraud-integration.service';
import { PaymentProcessorIntegrationService, PaymentProcessorFraudData } from '../services/payment-processor-integration.service';

@ApiTags('Fraud Detection')
@Controller('fraud-detection')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FraudDetectionController {
  constructor(
    private transactionMonitoringService: TransactionMonitoringService,
    private behavioralAnalysisService: BehavioralAnalysisService,
    private deviceFingerprintingService: DeviceFingerprintingService,
    private accountFlaggingService: AccountFlaggingService,
    private externalFraudIntegrationService: ExternalFraudIntegrationService,
    private paymentProcessorIntegrationService: PaymentProcessorIntegrationService,
  ) {}

  @Post('monitor-transaction')
  @ApiOperation({ summary: 'Monitor transaction for fraud' })
  @ApiResponse({ status: 200, description: 'Transaction monitoring result' })
  async monitorTransaction(@Body() transactionData: TransactionData): Promise<MonitoringResult> {
    try {
      return await this.transactionMonitoringService.monitorTransaction(transactionData);
    } catch (error) {
      throw new HttpException(
        `Transaction monitoring failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze-behavior')
  @ApiOperation({ summary: 'Analyze user behavior for anomalies' })
  @ApiResponse({ status: 200, description: 'Behavioral analysis result' })
  async analyzeBehavior(@Body() behaviorData: UserBehaviorData): Promise<BehavioralAnalysisResult> {
    try {
      return await this.behavioralAnalysisService.analyzeBehavior(behaviorData);
    } catch (error) {
      throw new HttpException(
        `Behavioral analysis failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('generate-device-fingerprint')
  @ApiOperation({ summary: 'Generate device fingerprint' })
  @ApiResponse({ status: 200, description: 'Device fingerprint generated' })
  async generateDeviceFingerprint(@Body() deviceData: DeviceFingerprintData) {
    try {
      return await this.deviceFingerprintingService.generateFingerprint(deviceData);
    } catch (error) {
      throw new HttpException(
        `Device fingerprinting failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('device-risk/:deviceId')
  @ApiOperation({ summary: 'Assess device risk' })
  @ApiResponse({ status: 200, description: 'Device risk assessment' })
  async assessDeviceRisk(@Param('deviceId') deviceId: string): Promise<DeviceRiskAssessment> {
    try {
      return await this.deviceFingerprintingService.assessDeviceRisk(deviceId);
    } catch (error) {
      throw new HttpException(
        `Device risk assessment failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('flag-account')
  @ApiOperation({ summary: 'Flag account for suspicious activity' })
  @ApiResponse({ status: 200, description: 'Account flagged successfully' })
  async flagAccount(@Body() flagData: AccountFlagData): Promise<{ caseId: string }> {
    try {
      const caseId = await this.accountFlaggingService.flagAccount(flagData);
      return { caseId };
    } catch (error) {
      throw new HttpException(
        `Account flagging failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('automated-review/:userId')
  @ApiOperation({ summary: 'Perform automated account review' })
  @ApiResponse({ status: 200, description: 'Automated review result' })
  async performAutomatedReview(@Param('userId') userId: string) {
    try {
      return await this.accountFlaggingService.performAutomatedReview(userId);
    } catch (error) {
      throw new HttpException(
        `Automated review failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('review-queue')
  @ApiOperation({ summary: 'Get fraud review queue' })
  @ApiResponse({ status: 200, description: 'Review queue retrieved' })
  async getReviewQueue(
    @Query('priority') priority?: string,
    @Query('assignedTo') assignedTo?: string,
  ): Promise<ReviewCase[]> {
    try {
      return await this.accountFlaggingService.getReviewQueue(priority as any, assignedTo);
    } catch (error) {
      throw new HttpException(
        `Failed to get review queue: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('assign-reviewer/:caseId')
  @ApiOperation({ summary: 'Assign reviewer to fraud case' })
  @ApiResponse({ status: 200, description: 'Reviewer assigned successfully' })
  async assignReviewer(
    @Param('caseId') caseId: string,
    @Body('reviewerId') reviewerId: string,
  ): Promise<{ success: boolean }> {
    try {
      await this.accountFlaggingService.assignReviewer(caseId, reviewerId);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to assign reviewer: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('resolve-case/:caseId')
  @ApiOperation({ summary: 'Resolve fraud case' })
  @ApiResponse({ status: 200, description: 'Case resolved successfully' })
  async resolveCase(
    @Param('caseId') caseId: string,
    @Body() resolution: {
      action: 'dismiss' | 'confirm_fraud' | 'suspend_account' | 'require_verification';
      reason: string;
      reviewerId: string;
      notes?: string;
    },
  ): Promise<{ success: boolean }> {
    try {
      await this.accountFlaggingService.resolveCase(caseId, resolution);
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `Failed to resolve case: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('external-fraud-check')
  @ApiOperation({ summary: 'Perform external fraud database check' })
  @ApiResponse({ status: 200, description: 'External fraud check result' })
  async performExternalFraudCheck(@Body() query: FraudDatabaseQuery) {
    try {
      const [comprehensiveCheck, globalCheck] = await Promise.all([
        this.externalFraudIntegrationService.performComprehensiveCheck(query),
        this.externalFraudIntegrationService.checkGlobalFraudDatabase(query),
      ]);

      return {
        comprehensiveCheck,
        globalCheck,
      };
    } catch (error) {
      throw new HttpException(
        `External fraud check failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('report-fraud')
  @ApiOperation({ summary: 'Report fraud to consortium' })
  @ApiResponse({ status: 200, description: 'Fraud reported successfully' })
  async reportFraud(@Body() fraudData: {
    userId: string;
    fraudType: string;
    evidence: Record<string, any>;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): Promise<{ success: boolean }> {
    try {
      const success = await this.externalFraudIntegrationService.reportFraudToConsortium(fraudData);
      return { success };
    } catch (error) {
      throw new HttpException(
        `Failed to report fraud: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('external-provider-status')
  @ApiOperation({ summary: 'Get external fraud provider status' })
  @ApiResponse({ status: 200, description: 'Provider status retrieved' })
  async getExternalProviderStatus() {
    try {
      return await this.externalFraudIntegrationService.getProviderStatus();
    } catch (error) {
      throw new HttpException(
        `Failed to get provider status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('payment-processor-check')
  @ApiOperation({ summary: 'Check with payment processor fraud tools' })
  @ApiResponse({ status: 200, description: 'Payment processor fraud check result' })
  async performPaymentProcessorCheck(@Body() fraudData: PaymentProcessorFraudData) {
    try {
      return await this.paymentProcessorIntegrationService.performComprehensiveProcessorCheck(fraudData);
    } catch (error) {
      throw new HttpException(
        `Payment processor check failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('stripe-radar-check')
  @ApiOperation({ summary: 'Check with Stripe Radar' })
  @ApiResponse({ status: 200, description: 'Stripe Radar check result' })
  async checkWithStripeRadar(@Body() fraudData: PaymentProcessorFraudData) {
    try {
      return await this.paymentProcessorIntegrationService.checkWithStripeRadar(fraudData);
    } catch (error) {
      throw new HttpException(
        `Stripe Radar check failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('paypal-risk-check')
  @ApiOperation({ summary: 'Check with PayPal Risk Manager' })
  @ApiResponse({ status: 200, description: 'PayPal Risk Manager check result' })
  async checkWithPayPalRiskManager(@Body() fraudData: PaymentProcessorFraudData) {
    try {
      return await this.paymentProcessorIntegrationService.checkWithPayPalRiskManager(fraudData);
    } catch (error) {
      throw new HttpException(
        `PayPal Risk Manager check failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('processor-status')
  @ApiOperation({ summary: 'Get payment processor status' })
  @ApiResponse({ status: 200, description: 'Processor status retrieved' })
  async getProcessorStatus() {
    try {
      return await this.paymentProcessorIntegrationService.getProcessorStatus();
    } catch (error) {
      throw new HttpException(
        `Failed to get processor status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync-fraud-rules')
  @ApiOperation({ summary: 'Sync fraud rules with payment processors' })
  @ApiResponse({ status: 200, description: 'Fraud rules synced successfully' })
  async syncFraudRules(): Promise<{ success: boolean; rulesUpdated: number }> {
    try {
      return await this.paymentProcessorIntegrationService.syncFraudRules();
    } catch (error) {
      throw new HttpException(
        `Failed to sync fraud rules: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

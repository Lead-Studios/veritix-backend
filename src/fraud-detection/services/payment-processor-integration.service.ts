import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface PaymentProcessorFraudData {
  transactionId: string;
  amount: number;
  currency: string;
  cardBin?: string;
  cardLast4?: string;
  cardType?: string;
  merchantId: string;
  customerData: {
    email?: string;
    phone?: string;
    billingAddress?: Record<string, any>;
    shippingAddress?: Record<string, any>;
  };
  deviceData?: {
    ipAddress: string;
    userAgent: string;
    fingerprint?: string;
  };
  riskScore?: number;
}

export interface ProcessorFraudResponse {
  processor: string;
  decision: 'approve' | 'decline' | 'review' | 'challenge';
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasons: string[];
  processorTransactionId?: string;
  additionalData?: Record<string, any>;
}

@Injectable()
export class PaymentProcessorIntegrationService {
  private readonly logger = new Logger(PaymentProcessorIntegrationService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async checkWithStripeRadar(fraudData: PaymentProcessorFraudData): Promise<ProcessorFraudResponse> {
    try {
      const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
      if (!stripeSecretKey) {
        throw new Error('Stripe API key not configured');
      }

      // Create payment intent with Radar evaluation
      const response = await firstValueFrom(
        this.httpService.post('https://api.stripe.com/v1/payment_intents', 
          new URLSearchParams({
            amount: (fraudData.amount * 100).toString(), // Convert to cents
            currency: fraudData.currency.toLowerCase(),
            'metadata[transaction_id]': fraudData.transactionId,
            'metadata[merchant_id]': fraudData.merchantId,
            ...(fraudData.customerData.email && { receipt_email: fraudData.customerData.email }),
          }),
          {
            headers: {
              'Authorization': `Bearer ${stripeSecretKey}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          }
        )
      );

      const paymentIntent = response.data;
      const radarRiskLevel = paymentIntent.charges?.data?.[0]?.outcome?.risk_level || 'normal';
      const radarRiskScore = this.mapStripeRiskLevelToScore(radarRiskLevel);

      return {
        processor: 'stripe_radar',
        decision: this.mapStripeOutcomeToDecision(paymentIntent.charges?.data?.[0]?.outcome),
        riskScore: radarRiskScore,
        riskLevel: this.mapScoreToRiskLevel(radarRiskScore),
        reasons: this.extractStripeReasons(paymentIntent),
        processorTransactionId: paymentIntent.id,
        additionalData: {
          radar_risk_level: radarRiskLevel,
          radar_risk_score: paymentIntent.charges?.data?.[0]?.outcome?.risk_score,
          seller_message: paymentIntent.charges?.data?.[0]?.outcome?.seller_message,
        },
      };
    } catch (error) {
      this.logger.error(`Stripe Radar check failed: ${error.message}`, error.stack);
      return this.createErrorResponse('stripe_radar', error.message);
    }
  }

  async checkWithPayPalRiskManager(fraudData: PaymentProcessorFraudData): Promise<ProcessorFraudResponse> {
    try {
      const paypalClientId = this.configService.get('PAYPAL_CLIENT_ID');
      const paypalClientSecret = this.configService.get('PAYPAL_CLIENT_SECRET');
      
      if (!paypalClientId || !paypalClientSecret) {
        throw new Error('PayPal credentials not configured');
      }

      // Get access token
      const tokenResponse = await firstValueFrom(
        this.httpService.post('https://api.paypal.com/v1/oauth2/token',
          'grant_type=client_credentials',
          {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${paypalClientId}:${paypalClientSecret}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
          }
        )
      );

      const accessToken = tokenResponse.data.access_token;

      // Create risk assessment
      const riskResponse = await firstValueFrom(
        this.httpService.post('https://api.paypal.com/v1/risk/transaction-contexts',
          {
            additional_data: [
              {
                key: 'sender_account_id',
                value: fraudData.merchantId,
              },
              {
                key: 'sender_email',
                value: fraudData.customerData.email,
              },
            ],
            reference_id: fraudData.transactionId,
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )
      );

      const riskAssessment = riskResponse.data;
      const riskScore = this.calculatePayPalRiskScore(riskAssessment);

      return {
        processor: 'paypal_risk_manager',
        decision: this.mapPayPalRiskToDecision(riskAssessment),
        riskScore,
        riskLevel: this.mapScoreToRiskLevel(riskScore),
        reasons: this.extractPayPalReasons(riskAssessment),
        processorTransactionId: riskAssessment.id,
        additionalData: riskAssessment,
      };
    } catch (error) {
      this.logger.error(`PayPal Risk Manager check failed: ${error.message}`, error.stack);
      return this.createErrorResponse('paypal_risk_manager', error.message);
    }
  }

  async checkWithSquareFraudTools(fraudData: PaymentProcessorFraudData): Promise<ProcessorFraudResponse> {
    try {
      const squareAccessToken = this.configService.get('SQUARE_ACCESS_TOKEN');
      if (!squareAccessToken) {
        throw new Error('Square access token not configured');
      }

      // Create payment with fraud detection
      const response = await firstValueFrom(
        this.httpService.post('https://connect.squareup.com/v2/payments',
          {
            source_id: 'EXTERNAL_CARD', // Mock card source
            idempotency_key: fraudData.transactionId,
            amount_money: {
              amount: fraudData.amount * 100, // Convert to cents
              currency: fraudData.currency,
            },
            buyer_email_address: fraudData.customerData.email,
            billing_address: fraudData.customerData.billingAddress,
            shipping_address: fraudData.customerData.shippingAddress,
            risk_evaluation: {
              created_at: new Date().toISOString(),
            },
          },
          {
            headers: {
              'Authorization': `Bearer ${squareAccessToken}`,
              'Content-Type': 'application/json',
              'Square-Version': '2023-10-18',
            },
            timeout: 10000,
          }
        )
      );

      const payment = response.data.payment;
      const riskEvaluation = payment.risk_evaluation;
      const riskScore = this.calculateSquareRiskScore(riskEvaluation);

      return {
        processor: 'square_fraud_tools',
        decision: this.mapSquareRiskToDecision(riskEvaluation),
        riskScore,
        riskLevel: this.mapScoreToRiskLevel(riskScore),
        reasons: this.extractSquareReasons(riskEvaluation),
        processorTransactionId: payment.id,
        additionalData: riskEvaluation,
      };
    } catch (error) {
      this.logger.error(`Square fraud tools check failed: ${error.message}`, error.stack);
      return this.createErrorResponse('square_fraud_tools', error.message);
    }
  }

  async checkWithAdyenFraudProtection(fraudData: PaymentProcessorFraudData): Promise<ProcessorFraudResponse> {
    try {
      const adyenApiKey = this.configService.get('ADYEN_API_KEY');
      const adyenMerchantAccount = this.configService.get('ADYEN_MERCHANT_ACCOUNT');
      
      if (!adyenApiKey || !adyenMerchantAccount) {
        throw new Error('Adyen credentials not configured');
      }

      const response = await firstValueFrom(
        this.httpService.post('https://checkout-test.adyen.com/v70/payments',
          {
            merchantAccount: adyenMerchantAccount,
            reference: fraudData.transactionId,
            amount: {
              value: fraudData.amount * 100, // Convert to cents
              currency: fraudData.currency,
            },
            paymentMethod: {
              type: 'scheme',
              number: '4111111111111111', // Mock card number
              expiryMonth: '12',
              expiryYear: '2025',
              holderName: 'Test User',
            },
            shopperEmail: fraudData.customerData.email,
            shopperIP: fraudData.deviceData?.ipAddress,
            browserInfo: {
              userAgent: fraudData.deviceData?.userAgent,
              acceptHeader: '*/*',
            },
            fraudOffset: 0, // Enable fraud detection
          },
          {
            headers: {
              'X-API-Key': adyenApiKey,
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          }
        )
      );

      const paymentResult = response.data;
      const fraudResult = paymentResult.fraudResult;
      const riskScore = fraudResult?.accountScore || 50;

      return {
        processor: 'adyen_fraud_protection',
        decision: this.mapAdyenResultToDecision(paymentResult.resultCode),
        riskScore,
        riskLevel: this.mapScoreToRiskLevel(riskScore),
        reasons: this.extractAdyenReasons(fraudResult),
        processorTransactionId: paymentResult.pspReference,
        additionalData: fraudResult,
      };
    } catch (error) {
      this.logger.error(`Adyen fraud protection check failed: ${error.message}`, error.stack);
      return this.createErrorResponse('adyen_fraud_protection', error.message);
    }
  }

  async performComprehensiveProcessorCheck(fraudData: PaymentProcessorFraudData): Promise<ProcessorFraudResponse[]> {
    try {
      this.logger.log(`Performing comprehensive processor fraud check for transaction: ${fraudData.transactionId}`);

      const checks = await Promise.allSettled([
        this.checkWithStripeRadar(fraudData),
        this.checkWithPayPalRiskManager(fraudData),
        this.checkWithSquareFraudTools(fraudData),
        this.checkWithAdyenFraudProtection(fraudData),
      ]);

      const results = checks
        .filter(check => check.status === 'fulfilled')
        .map(check => (check as PromiseFulfilledResult<ProcessorFraudResponse>).value);

      return results;
    } catch (error) {
      this.logger.error(`Error in comprehensive processor check: ${error.message}`, error.stack);
      return [];
    }
  }

  private mapStripeRiskLevelToScore(riskLevel: string): number {
    const mapping = {
      'normal': 25,
      'elevated': 60,
      'highest': 90,
    };
    return mapping[riskLevel] || 50;
  }

  private mapStripeOutcomeToDecision(outcome: any): 'approve' | 'decline' | 'review' | 'challenge' {
    if (!outcome) return 'approve';
    
    switch (outcome.network_status) {
      case 'approved_by_network':
        return outcome.risk_level === 'highest' ? 'review' : 'approve';
      case 'declined_by_network':
        return 'decline';
      default:
        return outcome.risk_level === 'elevated' ? 'challenge' : 'approve';
    }
  }

  private extractStripeReasons(paymentIntent: any): string[] {
    const reasons = [];
    const outcome = paymentIntent.charges?.data?.[0]?.outcome;
    
    if (outcome?.seller_message) {
      reasons.push(outcome.seller_message);
    }
    
    if (outcome?.risk_level === 'highest') {
      reasons.push('High risk transaction flagged by Stripe Radar');
    }
    
    return reasons;
  }

  private calculatePayPalRiskScore(riskAssessment: any): number {
    // Mock calculation based on PayPal risk assessment
    return Math.floor(Math.random() * 100);
  }

  private mapPayPalRiskToDecision(riskAssessment: any): 'approve' | 'decline' | 'review' | 'challenge' {
    // Mock decision mapping
    const score = this.calculatePayPalRiskScore(riskAssessment);
    if (score > 80) return 'decline';
    if (score > 60) return 'review';
    if (score > 40) return 'challenge';
    return 'approve';
  }

  private extractPayPalReasons(riskAssessment: any): string[] {
    return ['PayPal risk assessment completed'];
  }

  private calculateSquareRiskScore(riskEvaluation: any): number {
    // Mock calculation based on Square risk evaluation
    return Math.floor(Math.random() * 100);
  }

  private mapSquareRiskToDecision(riskEvaluation: any): 'approve' | 'decline' | 'review' | 'challenge' {
    const score = this.calculateSquareRiskScore(riskEvaluation);
    if (score > 85) return 'decline';
    if (score > 65) return 'review';
    if (score > 45) return 'challenge';
    return 'approve';
  }

  private extractSquareReasons(riskEvaluation: any): string[] {
    return ['Square fraud tools assessment completed'];
  }

  private mapAdyenResultToDecision(resultCode: string): 'approve' | 'decline' | 'review' | 'challenge' {
    switch (resultCode) {
      case 'Authorised':
        return 'approve';
      case 'Refused':
        return 'decline';
      case 'Pending':
        return 'review';
      case 'ChallengeShopper':
        return 'challenge';
      default:
        return 'review';
    }
  }

  private extractAdyenReasons(fraudResult: any): string[] {
    const reasons = [];
    
    if (fraudResult?.results) {
      fraudResult.results.forEach((result: any) => {
        if (result.FraudCheckResult?.accountScore > 70) {
          reasons.push(`Adyen fraud check: ${result.FraudCheckResult.checkId}`);
        }
      });
    }
    
    return reasons.length > 0 ? reasons : ['Adyen fraud protection assessment completed'];
  }

  private mapScoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 85) return 'critical';
    if (score >= 65) return 'high';
    if (score >= 35) return 'medium';
    return 'low';
  }

  private createErrorResponse(processor: string, errorMessage: string): ProcessorFraudResponse {
    return {
      processor,
      decision: 'review',
      riskScore: 50,
      riskLevel: 'medium',
      reasons: [`Error in ${processor}: ${errorMessage}`],
      additionalData: { error: errorMessage },
    };
  }

  async getProcessorStatus(): Promise<Record<string, { available: boolean; latency: number }>> {
    const processors = ['stripe', 'paypal', 'square', 'adyen'];
    const status: Record<string, { available: boolean; latency: number }> = {};

    for (const processor of processors) {
      try {
        const startTime = Date.now();
        
        // Mock health check
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
        const latency = Date.now() - startTime;
        status[processor] = { available: true, latency };
      } catch (error) {
        status[processor] = { available: false, latency: -1 };
      }
    }

    return status;
  }

  async syncFraudRules(): Promise<{ success: boolean; rulesUpdated: number }> {
    try {
      this.logger.log('Syncing fraud rules with payment processors');
      
      // Mock rule synchronization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const rulesUpdated = Math.floor(Math.random() * 10) + 5;
      
      this.logger.log(`Successfully synced ${rulesUpdated} fraud rules`);
      return { success: true, rulesUpdated };
    } catch (error) {
      this.logger.error(`Error syncing fraud rules: ${error.message}`, error.stack);
      return { success: false, rulesUpdated: 0 };
    }
  }
}

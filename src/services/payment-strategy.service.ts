import { Injectable } from '@nestjs/common';
import { PaymentStrategy } from '../interfaces/payment-strategy.interface';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { StripePaymentStrategy } from '../strategies/stripe-payment.strategy';
import { PaystackPaymentStrategy } from '../strategies/paystack-payment.strategy';
import { FlutterwavePaymentStrategy } from '../strategies/flutterwave-payment.strategy';
import { PaymentSettingsService } from './payment-settings.service';

@Injectable()
export class PaymentStrategyService {
  private strategies: Map<PaymentProvider, PaymentStrategy>;

  constructor(
    private stripeStrategy: StripePaymentStrategy,
    private paystackStrategy: PaystackPaymentStrategy,
    private flutterwaveStrategy: FlutterwavePaymentStrategy,
    private paymentSettingsService: PaymentSettingsService,
  ) {
    this.strategies = new Map<PaymentProvider, PaymentStrategy>([
      [PaymentProvider.STRIPE, this.stripeStrategy],
      [PaymentProvider.PAYSTACK, this.paystackStrategy],
      [PaymentProvider.FLUTTERWAVE, this.flutterwaveStrategy],
    ]);
  }

  async getDefaultStrategy(): Promise<PaymentStrategy> {
    const defaultProvider = await this.paymentSettingsService.getDefaultProvider();
    return this.getStrategy(defaultProvider);
  }

  getStrategy(provider: PaymentProvider): PaymentStrategy {
    const strategy = this.strategies.get(provider);
    if (!strategy) {
      throw new Error(`Payment strategy for ${provider} not found`);
    }
    return strategy;
  }

  getAllStrategies(): PaymentStrategy[] {
    return Array.from(this.strategies.values());
  }

  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.strategies.keys());
  }
}

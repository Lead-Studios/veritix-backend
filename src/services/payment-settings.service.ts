import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSettings } from '../entities/payment-settings.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';

@Injectable()
export class PaymentSettingsService {
  constructor(
    @InjectRepository(PaymentSettings)
    private paymentSettingsRepository: Repository<PaymentSettings>,
  ) {}

  async getSettings(): Promise<PaymentSettings> {
    let settings = await this.paymentSettingsRepository.findOne({ where: { id: 1 } });
    
    if (!settings) {
      settings = this.paymentSettingsRepository.create({
        defaultProvider: PaymentProvider.STRIPE,
        stripeEnabled: true,
        paystackEnabled: true,
        flutterwaveEnabled: true,
      });
      await this.paymentSettingsRepository.save(settings);
    }
    
    return settings;
  }

  async getDefaultProvider(): Promise<PaymentProvider> {
    const settings = await this.getSettings();
    return settings.defaultProvider;
  }

  async updateDefaultProvider(provider: PaymentProvider): Promise<PaymentSettings> {
    const settings = await this.getSettings();
    settings.defaultProvider = provider;
    return await this.paymentSettingsRepository.save(settings);
  }

  async updateProviderStatus(provider: string, enabled: boolean): Promise<PaymentSettings> {
    const settings = await this.getSettings();
    
    switch (provider) {
      case PaymentProvider.STRIPE:
        settings.stripeEnabled = enabled;
        break;
      case PaymentProvider.PAYSTACK:
        settings.paystackEnabled = enabled;
        break;
      case PaymentProvider.FLUTTERWAVE:
        settings.flutterwaveEnabled = enabled;
        break;
    }
    
    return await this.paymentSettingsRepository.save(settings);
  }
}
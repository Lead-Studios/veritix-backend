import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PaymentStrategy, PaymentRequest, PaymentResponse, VerificationResponse } from '../interfaces/payment-strategy.interface';

@Injectable()
export class FlutterwavePaymentStrategy implements PaymentStrategy {
  private readonly baseUrl = 'https://api.flutterwave.com/v3';
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('FLUTTERWAVE_SECRET_KEY');
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          tx_ref: request.reference,
          amount: request.amount,
          currency: request.currency,
          redirect_url: request.callback_url || `${this.configService.get('APP_URL')}/payment/callback`,
          customer: {
            email: request.email,
          },
          customizations: {
            title: 'Payment',
            description: 'Payment for services',
          },
          meta: request.metadata,
        },
        { headers: this.getHeaders() }
      );

      const data = response.data as {
        status: string;
        message: string;
        data: {
          id?: number | string;
          link?: string;
          [key: string]: any;
        };
      };

      return {
        success: data.status === 'success',
        transactionId: data.data.id?.toString() || '',
        paymentUrl: data.data.link,
        reference: request.reference,
        message: data.message,
        metadata: data.data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        reference: request.reference,
        message: `Flutterwave error: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  async verifyPayment(reference: string): Promise<VerificationResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transactions/verify_by_reference?tx_ref=${reference}`,
        { headers: this.getHeaders() }
      );

      const responseData = response.data as { data: any };
      const data = responseData.data;

      return {
        success: data.status === 'successful',
        status: data.status === 'successful' ? 'success' : 
               data.status === 'failed' ? 'failed' : 'pending',
        amount: parseFloat(data.amount),
        currency: data.currency,
        reference: data.tx_ref,
        transactionId: data.id.toString(),
        metadata: data.meta,
      };
    } catch (error) {
      return {
        success: false,
        status: 'failed',
        amount: 0,
        currency: '',
        reference,
        transactionId: '',
      };
    }
  }

  getProviderName(): string {
    return 'Flutterwave';
  }
}
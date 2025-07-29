import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PaymentStrategy, PaymentRequest, PaymentResponse, VerificationResponse } from '../interfaces/payment-strategy.interface';

@Injectable()
export class PaystackPaymentStrategy implements PaymentStrategy {
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('PAYSTACK_SECRET_KEY');
    if (!key) {
      throw new Error('PAYSTACK_SECRET_KEY is not defined in environment variables');
    }
    this.secretKey = key;
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
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: request.amount * 100, // Paystack uses kobo
          currency: request.currency,
          email: request.email,
          reference: request.reference,
          callback_url: request.callback_url,
          metadata: request.metadata,
        },
        { headers: this.getHeaders() }
      );

      const data = response.data as {
        status: boolean;
        message: string;
        data: {
          access_code: string;
          authorization_url: string;
          reference: string;
          [key: string]: any;
        };
      };

      return {
        success: data.status,
        transactionId: data.data.access_code,
        paymentUrl: data.data.authorization_url,
        reference: data.data.reference,
        message: data.message,
        metadata: data.data,
      };
    } catch (error) {
      return {
        success: false,
        transactionId: '',
        reference: request.reference,
        message: `Paystack error: ${error.response?.data?.message || error.message}`,
      };
    }
  }

  async verifyPayment(reference: string): Promise<VerificationResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.getHeaders() }
      );

      const data = response.data.data;

      return {
        success: data.status === 'success',
        status: data.status === 'success' ? 'success' : 
               data.status === 'failed' ? 'failed' : 'pending',
        amount: data.amount / 100, // Convert from kobo
        currency: data.currency,
        reference: data.reference,
        transactionId: data.id.toString(),
        metadata: data.metadata,
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
    return 'Paystack';
  }
}

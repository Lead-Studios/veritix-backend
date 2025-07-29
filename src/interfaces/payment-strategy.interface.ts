export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  paymentUrl?: string;
  reference: string;
  message: string;
  metadata?: any;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  reference: string;
  callback_url?: string;
  metadata?: any;
}

export interface VerificationResponse {
  success: boolean;
  status: 'success' | 'failed' | 'pending';
  amount: number;
  currency: string;
  reference: string;
  transactionId: string;
  metadata?: any;
}

export interface PaymentStrategy {
  initializePayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyPayment(reference: string): Promise<VerificationResponse>;
  getProviderName(): string;
}
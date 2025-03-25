export interface PaymentServiceInterface {
    processPayment(amount: number, paymentDetails: any): Promise<boolean>;
  }
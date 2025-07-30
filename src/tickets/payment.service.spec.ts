import { PaymentService } from './payment.service';
import Stripe from 'stripe';

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let stripeMock: any;

  beforeEach(() => {
    stripeMock = {
      paymentIntents: {
        create: jest.fn(),
      },
    };
    paymentService = new PaymentService(stripeMock as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return payment intent id on success', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({
      status: 'succeeded',
      id: 'pi_123',
    });
    const result = await paymentService.processPayment('tok_test', 100);
    expect(result).toBe('pi_123');
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith({
      amount: 100 * 100,
      currency: 'usd',
      payment_method: 'tok_test',
      confirm: true,
    });
  });

  it('should throw if payment is not successful', async () => {
    stripeMock.paymentIntents.create.mockResolvedValue({
      status: 'requires_payment_method',
      id: 'pi_456',
    });
    await expect(
      paymentService.processPayment('tok_test', 100),
    ).rejects.toThrow('Payment failed: Payment not successful');
  });

  it('should throw and log error if Stripe throws', async () => {
    const error = new Error('Stripe error');
    stripeMock.paymentIntents.create.mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    await expect(
      paymentService.processPayment('tok_test', 100),
    ).rejects.toThrow('Payment failed: Stripe error');
    expect(consoleSpy).toHaveBeenCalledWith('Stripe error:', error);
  });
});

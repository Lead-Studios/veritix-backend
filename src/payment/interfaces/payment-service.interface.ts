import { ApiProperty } from '@nestjs/swagger';

export class PaymentDetails {
    @ApiProperty({
        description: 'The payment method ID from the payment provider',
        example: 'pm_1234567890'
    })
    paymentMethodId: string;

    @ApiProperty({
        description: 'Additional payment metadata',
        example: {
            saveCard: true,
            customerId: 'cus_123456',
            paymentType: 'card'
        },
        required: false
    })
    metadata?: Record<string, any>;

    @ApiProperty({
        description: 'Card holder name',
        example: 'John Doe',
        required: false
    })
    cardHolderName?: string;

    @ApiProperty({
        description: 'Last 4 digits of the card',
        example: '4242',
        required: false
    })
    last4?: string;

    @ApiProperty({
        description: 'Card brand (e.g., visa, mastercard)',
        example: 'visa',
        required: false
    })
    cardBrand?: string;
}

export interface PaymentServiceInterface {
    /**
     * Process a payment transaction
     * @param amount The payment amount in dollars
     * @param paymentDetails The payment method and additional details
     * @returns Promise resolving to true if payment was successful
     */
    processPayment(amount: number, paymentDetails: PaymentDetails): Promise<boolean>;
}
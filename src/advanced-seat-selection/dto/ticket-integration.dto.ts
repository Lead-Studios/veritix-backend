import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, IsArray, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class TicketPurchaseIntegrationDto {
  @ApiProperty({ description: 'Event ID' })
  @IsUUID()
  eventId: string;

  @ApiProperty({ description: 'Venue map ID' })
  @IsUUID()
  venueMapId: string;

  @ApiProperty({ description: 'Session ID for seat reservations' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'User ID making the purchase', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Selected seat IDs' })
  @IsArray()
  @IsUUID(4, { each: true })
  seatIds: string[];

  @ApiProperty({ description: 'Total amount for the purchase' })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'Payment method ID' })
  @IsString()
  paymentMethodId: string;

  @ApiProperty({ description: 'Customer information' })
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo: CustomerInfoDto;

  @ApiProperty({ description: 'Group booking ID if applicable', required: false })
  @IsOptional()
  @IsUUID()
  groupBookingId?: string;
}

export class CustomerInfoDto {
  @ApiProperty({ description: 'Customer first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Customer last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Customer email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Customer phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Billing address', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  billingAddress?: AddressDto;
}

export class AddressDto {
  @ApiProperty({ description: 'Street address' })
  @IsString()
  street: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'State or province' })
  @IsString()
  state: string;

  @ApiProperty({ description: 'Postal code' })
  @IsString()
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;
}

export class TicketGenerationDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Seat reservation IDs to convert to tickets' })
  @IsArray()
  @IsUUID(4, { each: true })
  reservationIds: string[];

  @ApiProperty({ description: 'Ticket type', required: false })
  @IsOptional()
  @IsString()
  ticketType?: string;

  @ApiProperty({ description: 'Special instructions or notes', required: false })
  @IsOptional()
  @IsString()
  specialInstructions?: string;
}

export class SeatHoldDto {
  @ApiProperty({ description: 'Seat IDs to hold' })
  @IsArray()
  @IsUUID(4, { each: true })
  seatIds: string[];

  @ApiProperty({ description: 'Hold duration in minutes' })
  @IsNumber()
  holdDurationMinutes: number;

  @ApiProperty({ description: 'Hold reference (e.g., cart ID)' })
  @IsString()
  holdReference: string;

  @ApiProperty({ description: 'Hold type' })
  @IsString()
  holdType: 'cart' | 'checkout' | 'payment' | 'admin';
}

export class SeatReleaseDto {
  @ApiProperty({ description: 'Seat IDs to release' })
  @IsArray()
  @IsUUID(4, { each: true })
  seatIds: string[];

  @ApiProperty({ description: 'Release reason' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Session or reference ID' })
  @IsString()
  referenceId: string;
}

export class PricingIntegrationDto {
  @ApiProperty({ description: 'Seat IDs for pricing calculation' })
  @IsArray()
  @IsUUID(4, { each: true })
  seatIds: string[];

  @ApiProperty({ description: 'Apply dynamic pricing', required: false })
  @IsOptional()
  @IsBoolean()
  applyDynamicPricing?: boolean;

  @ApiProperty({ description: 'Discount code', required: false })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiProperty({ description: 'Group booking discount', required: false })
  @IsOptional()
  @IsNumber()
  groupDiscount?: number;
}

export class TicketPurchaseResponseDto {
  @ApiProperty({ description: 'Purchase success status' })
  success: boolean;

  @ApiProperty({ description: 'Order ID' })
  orderId: string;

  @ApiProperty({ description: 'Generated ticket IDs' })
  ticketIds: string[];

  @ApiProperty({ description: 'Total amount charged' })
  totalAmount: number;

  @ApiProperty({ description: 'Payment transaction ID' })
  transactionId: string;

  @ApiProperty({ description: 'Seat details for purchased tickets' })
  seats: Array<{
    seatId: string;
    sectionName: string;
    row: string;
    number: string;
    price: number;
    ticketId: string;
  }>;

  @ApiProperty({ description: 'Purchase timestamp' })
  purchaseDate: Date;

  @ApiProperty({ description: 'Error message if purchase failed', required: false })
  errorMessage?: string;
}

export class SeatPricingResponseDto {
  @ApiProperty({ description: 'Seat pricing breakdown' })
  seatPricing: Array<{
    seatId: string;
    basePrice: number;
    dynamicPrice: number;
    finalPrice: number;
    discounts: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    fees: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
  }>;

  @ApiProperty({ description: 'Total base amount' })
  totalBaseAmount: number;

  @ApiProperty({ description: 'Total discount amount' })
  totalDiscountAmount: number;

  @ApiProperty({ description: 'Total fee amount' })
  totalFeeAmount: number;

  @ApiProperty({ description: 'Final total amount' })
  finalTotalAmount: number;

  @ApiProperty({ description: 'Pricing calculation timestamp' })
  calculatedAt: Date;
}

export class CartIntegrationDto {
  @ApiProperty({ description: 'Cart ID' })
  @IsString()
  cartId: string;

  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: 'Seat IDs to add to cart' })
  @IsArray()
  @IsUUID(4, { each: true })
  seatIds: string[];

  @ApiProperty({ description: 'Cart expiry time in minutes' })
  @IsNumber()
  expiryMinutes: number;
}

export class CheckoutIntegrationDto {
  @ApiProperty({ description: 'Cart ID' })
  @IsString()
  cartId: string;

  @ApiProperty({ description: 'Session ID' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Checkout session duration in minutes' })
  @IsNumber()
  checkoutDurationMinutes: number;

  @ApiProperty({ description: 'Payment intent ID' })
  @IsString()
  paymentIntentId: string;
}

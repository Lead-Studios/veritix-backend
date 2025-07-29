import {
  IsString,
  IsInt,
  IsEmail,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Address } from '../interfaces/address.interface';
import { BillingDetails } from '../interfaces/billing-details.interface';

export class BillingDetailsDto implements BillingDetails {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class AddressDto implements Address {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class PurchaseTicketDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsInt()
  @Min(1)
  ticketQuantity: number;

  @ValidateNested()
  @Type(() => BillingDetailsDto)
  billingDetails: BillingDetailsDto;

  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  // Payment details would be handled securely, so only a token or reference is expected
  @IsString()
  @IsNotEmpty()
  paymentToken: string;

  // Optional promo code
  @IsString()
  @IsNotEmpty({ each: false })
  promoCode?: string;

  // Conference/session ticketing support
  @IsString()
  @IsNotEmpty()
  ticketType: 'conference' | 'session';

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sessionIds?: string[]; // Required if ticketType is 'session'
}

import { IsString, IsInt, IsEmail, IsNotEmpty, Min, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Address } from '../interfaces/address.interface';
import { BillingDetails } from '../interfaces/billing-details.interface';
import { ApiProperty } from '@nestjs/swagger';

export class BillingDetailsDto implements BillingDetails {
  @ApiProperty({ description: 'Full name of the purchaser' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Email address of the purchaser' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number of the purchaser' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class AddressDto implements Address {
  @ApiProperty({ description: 'Country of the purchaser' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'State/Province of the purchaser' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ description: 'City of the purchaser' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Street address of the purchaser' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'Postal code of the purchaser' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class PurchaseTicketDto {
  @ApiProperty({ description: 'The ID of the event for initial sale, or NFT ticket ID for secondary sale' })
  @IsString()
  @IsNotEmpty()
  itemId: string; // Can be eventId for initial sale or nftTicketId for secondary sale

  @ApiProperty({ description: 'The quantity of tickets to purchase (for initial sales)', required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  ticketQuantity?: number;

  @ApiProperty({ description: 'The price paid for the ticket' })
  @IsNumber()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ description: 'The wallet address of the buyer' })
  @IsString()
  @IsNotEmpty()
  buyerWalletAddress: string;

  @ApiProperty({ description: 'Optional: The wallet address of the current owner for secondary sales', required: false })
  @IsString()
  @IsOptional()
  currentOwnerWalletAddress?: string;

  @ApiProperty({ description: 'Optional: Indicates if this is a secondary market purchase', required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSecondarySale?: boolean;

  @ApiProperty({ description: 'Billing details of the purchaser', type: BillingDetailsDto })
  @ValidateNested()
  @Type(() => BillingDetailsDto)
  billingDetails: BillingDetailsDto;

  @ApiProperty({ description: 'Address of the purchaser', type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @ApiProperty({ description: 'Payment token for processing the transaction' })
  @IsString()
  @IsNotEmpty()
  paymentToken: string;

  @ApiProperty({ description: 'Optional promo code', required: false })
  @IsString()
  @IsOptional()
  promoCode?: string;

  @ApiProperty({ description: 'Type of ticket: conference or session', enum: ['conference', 'session'] })
  @IsString()
  @IsNotEmpty()
  ticketType: 'conference' | 'session';

  @ApiProperty({ description: 'Required if ticketType is session', type: [String], required: false })
  @IsString({ each: true })
  @IsOptional()
  sessionIds?: string[];

  @ApiProperty({ description: 'Whether the buyer opts in for ticket insurance', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  insuranceOptIn?: boolean;
}
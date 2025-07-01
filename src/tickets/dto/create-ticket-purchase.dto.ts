import {
  IsNotEmpty,
  IsUUID,
  IsInt,
  IsPositive,
  IsString,
  IsEmail,
  ValidateNested,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class BillingDetailsDto {
  @ApiProperty({
    description: "Full name of the ticket purchaser",
    example: "John Doe",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({
    description: "Email address for ticket delivery and confirmation",
    example: "john.doe@example.com",
    format: "email",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contact phone number in international format",
    example: "+1-555-123-4567",
    pattern: "^\+[1-9]\d{1,14}$",
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class AddressDetailsDto {
  @ApiProperty({
    description: "Country of residence",
    example: "United States",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({
    description: "State or province",
    example: "California",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: "City name",
    example: "San Francisco",
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: "Street address including house/building number",
    example: "123 Main Street",
    minLength: 5,
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    description: "Postal/ZIP code",
    example: "94105",
    pattern: "^[0-9A-Z]{3,10}$",
  })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class CreateTicketPurchaseDto {
  @ApiProperty({
    description: "UUID of the event being booked",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    description: "UUID of the ticket type being purchased",
    example: "987fcdeb-89a1-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsUUID()
  @IsNotEmpty()
  ticketId: string;

  @ApiProperty({
    description: "Number of tickets to purchase",
    example: 2,
    minimum: 1,
    type: "integer",
  })
  @IsInt()
  @IsPositive()
  ticketQuantity: number;

  @ApiProperty({
    description: "Billing details for the purchase",
    type: () => BillingDetailsDto,
  })
  @ValidateNested()
  @Type(() => BillingDetailsDto)
  billingDetails: BillingDetailsDto;

  @ApiProperty({
    description: "Address details for billing/shipping",
    type: () => AddressDetailsDto,
  })
  @ValidateNested()
  @Type(() => AddressDetailsDto)
  addressDetails: AddressDetailsDto;

  // NEW: Group booking fields
  @ApiProperty({
    description: "Whether this is a group booking",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isGroupBooking?: boolean;

  @ApiProperty({
    description: "Name for the group booking",
    example: "Smith Family Reunion",
    required: false,
  })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiProperty({
    description: "Description of the group",
    example: "Family reunion attendees",
    required: false,
  })
  @IsOptional()
  @IsString()
  groupDescription?: string;
}

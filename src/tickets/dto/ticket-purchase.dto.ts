import {
  IsString,
  IsNumber,
  IsEmail,
  IsPhoneNumber,
  IsNotEmpty,
  Min,
  IsUUID,
} from "class-validator";

export class AddressDetailsDto {
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

export class BillingDetailsDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsPhoneNumber()
  @IsNotEmpty()
  phoneNumber: string;

  @IsNotEmpty()
  address: AddressDetailsDto;
}

export class TicketPurchaseDto {
  @IsUUID()
  @IsNotEmpty()
  conferenceId: string;

  @IsNumber()
  @Min(1)
  ticketQuantity: number;

  @IsNotEmpty()
  billingDetails: BillingDetailsDto;
}

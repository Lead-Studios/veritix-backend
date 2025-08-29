import { IsString, IsOptional, IsNumber, IsObject, IsArray, IsDateString, IsEnum } from 'class-validator';
import { BookingPriority } from '../entities/service-booking.entity';

export class CreateBookingDto {
  @IsString()
  organizerId: string;

  @IsString()
  serviceId: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  pricingId?: string;

  @IsOptional()
  @IsEnum(BookingPriority)
  priority?: BookingPriority;

  @IsDateString()
  eventDate: Date;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsNumber()
  guestCount?: number;

  @IsOptional()
  @IsObject()
  eventLocation?: {
    venueName?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude?: number;
    longitude?: number;
    specialInstructions?: string;
  };

  @IsOptional()
  @IsArray()
  selectedAddOns?: {
    name: string;
    price: number;
    quantity?: number;
  }[];

  @IsOptional()
  @IsArray()
  appliedDiscounts?: {
    type: string;
    value: number;
    amount: number;
    description?: string;
  }[];

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  organizerNotes?: string;

  @IsOptional()
  @IsObject()
  contactInfo?: {
    primaryContact: {
      name: string;
      phone: string;
      email: string;
    };
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };

  @IsOptional()
  @IsObject()
  timeline?: {
    setupStart?: Date;
    serviceStart: Date;
    serviceEnd: Date;
    cleanupEnd?: Date;
  };

  @IsOptional()
  @IsObject()
  requirements?: {
    equipment?: string[];
    space?: string[];
    power?: string[];
    other?: string[];
  };

  @IsOptional()
  @IsNumber()
  travelFee?: number;
}

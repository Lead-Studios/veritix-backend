import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ContactCategory,
  ContactStatus,
} from '../interfaces/contact.interface';
import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  id: string;

  name: string;

  email: string;

  subject: string;

  message: string;

  category: ContactCategory;

  status: ContactStatus;

  userId?: string;

  eventId?: string;

  assignedTo?: string;

  response?: string;

  respondedAt?: Date;

  phoneNumber?: string;

  companyName?: string;

  website?: string;

  priority?: string;

  attachmentUrls?: string;

  userAgent?: string;

  ipAddress?: string;

  internalNotes?: string;

  followUpDate?: Date;

  tags?: string[];

  createdAt: Date;

  updatedAt: Date;

  user?: UserSummaryDto;

  event?: EventSummaryDto;

  assignedStaff?: StaffSummaryDto;
}

export class ContactSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  priority?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  respondedAt?: Date;
}

export class UserSummaryDto {
  id: string;

  name?: string;

  email: string;

  avatar?: string;
}

export class EventSummaryDto {
  id: string;

  title: string;

  eventDate: Date;

  status: string;

  isVirtual: boolean;
}

export class StaffSummaryDto {
  id: string;

  name?: string;

  email: string;

  role?: string;

  department?: string;
}

export class ContactStatsDto {
  totalInquiries: number;

  newInquiries: number;

  reviewedInquiries: number;

  respondedInquiries: number;

  resolvedInquiries: number;

  averageResponseTime?: number;

  responseRate: number;

  resolutionRate: number;

  inquiriesByCategory: {
    [key in ContactCategory]: number;
  };

  inquiriesByStatus: {
    [key in ContactStatus]: number;
  };

  monthlyTrends: {
    month: string;
    inquiries: number;
    responses: number;
    resolutions: number;
  }[];

  staffPerformance: {
    staffId: string;
    staffName: string;
    assignedCount: number;
    resolvedCount: number;
    averageResponseTime?: number;
  }[];

  calculatedAt: Date;
}

export class BulkContactResponseDto {
  totalProcessed: number;

  successful: number;

  failed: number;

  results: ContactSummaryDto[];

  errors: ContactErrorDto[];

  processedAt: Date;
}

export class ContactErrorDto {
  contactId: string;

  error: string;

  field?: string;
}

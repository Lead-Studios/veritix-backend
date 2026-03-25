import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsEmail,
  Length,
  IsDateString,
  IsNumber,
  Max,
  Min,
  IsNotEmpty,
} from 'class-validator';
import {
  ContactStatus,
  ContactCategory,
} from '../interfaces/contact.interface';
import { Type } from 'class-transformer';

export class RespondToInquiryDto {
  @ApiProperty({
    example: 'Thank you for reaching out. We have resolved your issue.',
    description: 'The response message to send to the submitter',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 2000)
  response: string;
}

export class AssignInquiryDto {
  @ApiProperty({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'UUID of the staff member to assign this inquiry to',
  })
  @IsUUID()
  staffId: string;
}

export class CreateContactDto {
  @ApiProperty({ example: 'John Doe', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'john@example.com', maxLength: 255 })
  @IsEmail()
  @Length(1, 255)
  email: string;

  @ApiProperty({ example: 'Payment issue', maxLength: 200 })
  @IsString()
  @Length(1, 200)
  subject: string;

  @ApiProperty({ example: 'I was charged twice...', maxLength: 2000 })
  @IsString()
  @Length(1, 2000)
  message: string;

  @ApiPropertyOptional({
    enum: ContactCategory,
    default: ContactCategory.GENERAL,
  })
  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory = ContactCategory.GENERAL;

  @ApiPropertyOptional({ example: 'uuid-user-id' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'uuid-event-id' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Acme Ltd' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  companyName?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  website?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  priority?: string;

  @ApiPropertyOptional({ example: 'https://file-url.com/doc.pdf' })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  attachmentUrls?: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0...' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  userAgent?: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  ipAddress?: string;
}

export class UpdateContactDto {
  @ApiPropertyOptional({ enum: ContactStatus, example: ContactStatus.REVIEWED })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional({
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    description: 'UUID of the assigned staff member',
  })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: 'Looking into this now.', maxLength: 2000 })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  response?: string;

  @ApiPropertyOptional({
    enum: ContactCategory,
    example: ContactCategory.SUPPORT,
  })
  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory;

  @ApiPropertyOptional({ example: 'high', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  priority?: string;

  @ApiPropertyOptional({
    example: 'Needs escalation to billing team.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  internalNotes?: string;

  @ApiPropertyOptional({ example: '2025-03-01T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @ApiPropertyOptional({ example: 'billing,urgent', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  tags?: string;
}

export class ContactQueryDto {
  @ApiPropertyOptional({ enum: ContactStatus, example: ContactStatus.NEW })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional({
    enum: ContactCategory,
    example: ContactCategory.SUPPORT,
  })
  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory;

  @ApiPropertyOptional({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({
    example: 'ticket refund',
    description: 'Full-text search across name, email, subject, and message',
  })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  priority?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ example: 'billing,urgent' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  tags?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'respondedAt', 'priority'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'respondedAt', 'priority'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class BulkContactUpdateDto {
  @ApiProperty({
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  contactIds: string[];

  @ApiPropertyOptional({ enum: ContactStatus })
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  response?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 100)
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  internalNotes?: string;
}

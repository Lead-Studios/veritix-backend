import { IsString, IsOptional, IsEnum, IsUUID, IsEmail, Length, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ContactCategory, ContactStatus } from '../interfaces/contact.interface';

export class CreateContactDto {
  @IsString()
  @Length(1, 100)
  name: string;

  @IsEmail()
  @Length(1, 255)
  email: string;

  @IsString()
  @Length(1, 200)
  subject: string;

  @IsString()
  @Length(1, 2000)
  message: string;

  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory = ContactCategory.GENERAL;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  website?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  priority?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  attachmentUrls?: string;

  @IsOptional()
  @IsString()
  @Length(1, 500)
  userAgent?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  ipAddress?: string;
}

export class UpdateContactDto {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  response?: string;

  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  priority?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  internalNotes?: string;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  tags?: string;
}

export class ContactQueryDto {
  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsEnum(ContactCategory)
  category?: ContactCategory;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  search?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  priority?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  tags?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'respondedAt', 'priority'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class BulkContactUpdateDto {
  @IsString()
  @Length(1, 100, { each: true })
  contactIds: string[];

  @IsOptional()
  @IsEnum(ContactStatus)
  status?: ContactStatus;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  response?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  priority?: string;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  internalNotes?: string;
}

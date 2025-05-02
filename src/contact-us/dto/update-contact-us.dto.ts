import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactCategory } from './create-contact-us.dto';

export enum ContactStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export class UpdateContactUsDto {
  @ApiPropertyOptional({
    description: 'Updated status of the contact message',
    enum: ContactStatus,
    example: ContactStatus.IN_PROGRESS
  })
  @IsEnum(ContactStatus)
  @IsOptional()
  status?: ContactStatus;

  @ApiPropertyOptional({
    description: 'Updated category of the contact message',
    enum: ContactCategory,
    example: ContactCategory.TECHNICAL
  })
  @IsEnum(ContactCategory)
  @IsOptional()
  category?: ContactCategory;

  @ApiPropertyOptional({
    description: 'Internal notes about the contact message',
    example: 'Customer was contacted via email on 2025-04-30'
  })
  @IsString()
  @IsOptional()
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'ID of the admin handling this message',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Resolution details or response sent to the customer',
    example: 'Issue was resolved by providing step-by-step registration instructions'
  })
  @IsString()
  @IsOptional()
  resolution?: string;
}
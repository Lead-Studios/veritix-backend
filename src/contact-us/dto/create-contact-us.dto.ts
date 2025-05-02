import { IsString, IsEmail, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContactCategory {
  GENERAL = 'general',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  EVENTS = 'events',
  OTHER = 'other'
}

export class CreateContactUsDto {
  @ApiProperty({
    description: 'Name of the person submitting the contact form',
    example: 'John Doe'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email address of the sender',
    example: 'johndoe@example.com'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Subject of the contact message',
    example: 'Question about event registration'
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    description: 'Main content of the contact message',
    example: 'I am having trouble registering for the Tech Conference event...'
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Category of the contact message',
    enum: ContactCategory,
    example: ContactCategory.EVENTS
  })
  @IsEnum(ContactCategory)
  @IsNotEmpty()
  category: ContactCategory;

  @ApiPropertyOptional({
    description: 'Reference number or ID related to the inquiry (e.g., event ID, order number)',
    example: 'EVT-2025-001'
  })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the sender',
    example: '+1234567890'
  })
  @IsString()
  @IsOptional()
  phoneNumber?: string;
}
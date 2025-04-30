import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactCategory } from '../dto/create-contact-us.dto';
import { ContactStatus } from '../dto/update-contact-us.dto';

@Entity()
export class ContactUs {
  @ApiProperty({
    description: 'Unique identifier of the contact message',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the person who submitted the contact form',
    example: 'John Doe'
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'Email address of the sender',
    example: 'johndoe@example.com'
  })
  @Column()
  email: string;

  @ApiProperty({
    description: 'Subject of the contact message',
    example: 'Question about event registration'
  })
  @Column()
  subject: string;

  @ApiProperty({
    description: 'Main content of the contact message',
    example: 'I am having trouble registering for the Tech Conference event...'
  })
  @Column('text')
  message: string;

  @ApiProperty({
    description: 'Category of the contact message',
    enum: ContactCategory,
    example: ContactCategory.EVENTS
  })
  @Column({
    type: 'enum',
    enum: ContactCategory,
    default: ContactCategory.GENERAL
  })
  category: ContactCategory;

  @ApiPropertyOptional({
    description: 'Reference number or ID related to the inquiry',
    example: 'EVT-2025-001'
  })
  @Column({ nullable: true })
  referenceNumber?: string;

  @ApiPropertyOptional({
    description: 'Phone number of the sender',
    example: '+1234567890'
  })
  @Column({ nullable: true })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Status of the contact message',
    enum: ContactStatus,
    example: ContactStatus.NEW
  })
  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.NEW
  })
  status: ContactStatus;

  @ApiPropertyOptional({
    description: 'Internal notes about the contact message',
    example: 'Customer was contacted via email on 2025-04-30'
  })
  @Column('text', { nullable: true })
  adminNotes?: string;

  @ApiPropertyOptional({
    description: 'ID of the admin handling this message',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @Column({ nullable: true })
  assignedTo?: string;

  @ApiPropertyOptional({
    description: 'Resolution details or response sent to the customer',
    example: 'Issue was resolved by providing step-by-step registration instructions'
  })
  @Column('text', { nullable: true })
  resolution?: string;

  @ApiProperty({
    description: 'Date and time when the message was created',
    example: '2025-04-30T10:00:00Z'
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the message was last updated',
    example: '2025-04-30T15:30:00Z'
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Date and time when the message was resolved or closed',
    example: '2025-05-01T09:00:00Z'
  })
  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;
}
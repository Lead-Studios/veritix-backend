import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Event } from '../events/entities/event.entity';

@Entity()
export class Sponsor {
  @ApiProperty({
    description: 'Unique identifier of the sponsor',
    example: 1
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Name of the sponsoring brand or company',
    example: 'Tech Corp International'
  })
  @Column()
  brandName: string;

  @ApiProperty({
    description: 'URL of the sponsor\'s brand image or logo',
    example: 'https://example.com/images/sponsor-logo.png'
  })
  @Column()
  brandImage: string;

  @ApiProperty({
    description: 'Website URL of the sponsor',
    example: 'https://techcorp.com'
  })
  @Column()
  brandWebsite: string;

  @ApiProperty({
    description: 'Social media links for the sponsor',
    example: {
      facebook: 'https://facebook.com/techcorp',
      twitter: 'https://twitter.com/techcorp',
      instagram: 'https://instagram.com/techcorp'
    }
  })
  @Column('json')
  socialMediaLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
  };

  @ApiProperty({
    description: 'Event being sponsored',
    type: () => Event
  })
  @ManyToOne(() => Event, event => event.sponsors)
  event: Event;

  @ApiProperty({
    description: 'Date and time when the sponsor was created',
    example: '2025-04-30T10:00:00Z'
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the sponsor was last updated',
    example: '2025-04-30T15:30:00Z'
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Sponsorship tier level',
    example: 'Gold',
    enum: ['Platinum', 'Gold', 'Silver', 'Bronze']
  })
  @Column({ nullable: true })
  tier?: string;

  @ApiPropertyOptional({
    description: 'Additional details or notes about the sponsorship',
    example: 'Main stage naming rights included'
  })
  @Column({ type: 'text', nullable: true })
  details?: string;
}
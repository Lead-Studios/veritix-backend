import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Event } from '../../events/entities/event.entity';

@Entity()
export class SpecialGuest {
  @ApiProperty({
    description: 'Unique identifier of the special guest',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the special guest',
    example: 'John Doe'
  })
  @Column()
  name: string;

  @ApiProperty({
    description: 'URL of the special guest\'s profile image',
    example: 'https://example.com/images/john-doe.jpg'
  })
  @Column()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'Bio or description of the special guest',
    example: 'Award-winning tech innovator and keynote speaker'
  })
  @Column({ type: 'text', nullable: true })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Role or title of the special guest at the event',
    example: 'Keynote Speaker'
  })
  @Column({ nullable: true })
  role?: string;

  @ApiPropertyOptional({
    description: 'Special guest\'s Facebook profile URL',
    example: 'https://facebook.com/johndoe'
  })
  @Column({ nullable: true })
  facebook?: string;

  @ApiPropertyOptional({
    description: 'Special guest\'s Twitter profile URL',
    example: 'https://twitter.com/johndoe'
  })
  @Column({ nullable: true })
  twitter?: string;

  @ApiPropertyOptional({
    description: 'Special guest\'s Instagram profile URL',
    example: 'https://instagram.com/johndoe'
  })
  @Column({ nullable: true })
  instagram?: string;

  @ApiProperty({
    description: 'Event this special guest is appearing at',
    type: () => Event
  })
  @ManyToOne(() => Event, event => event.specialGuests)
  event: Event;

  @ApiProperty({
    description: 'Date and time when the special guest was created',
    example: '2025-04-30T10:00:00Z'
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the special guest was last updated',
    example: '2025-04-30T15:30:00Z'
  })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}

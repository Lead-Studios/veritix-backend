import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Event } from '../../events/entities/event.entity';
import { MediaType } from '../dto/create-gallery-item.dto';

@Entity()
export class GalleryItem {
  @ApiProperty({
    description: 'Unique identifier for the gallery item',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Event this gallery item belongs to',
    type: () => Event
  })
  @ManyToOne(() => Event, event => event.galleryItems)
  event: Event;

  @ApiProperty({
    description: 'Type of media (image or video)',
    enum: MediaType,
    example: MediaType.IMAGE
  })
  @Column({
    type: 'enum',
    enum: MediaType
  })
  type: MediaType;

  @ApiProperty({
    description: 'URL of the media file',
    example: 'https://storage.example.com/events/123/opening-ceremony.jpg'
  })
  @Column()
  url: string;

  @ApiPropertyOptional({
    description: 'Title of the gallery item',
    example: 'Opening Ceremony'
  })
  @Column({ nullable: true })
  title?: string;

  @ApiPropertyOptional({
    description: 'Description of the gallery item',
    example: 'Capture of the spectacular opening ceremony fireworks'
  })
  @Column('text', { nullable: true })
  description?: string;

  @ApiPropertyOptional({
    description: 'Alt text for accessibility',
    example: 'Colorful fireworks display over the main stage'
  })
  @Column({ nullable: true })
  altText?: string;

  @ApiPropertyOptional({
    description: 'Thumbnail URL for preview',
    example: 'https://storage.example.com/events/123/opening-ceremony-thumb.jpg'
  })
  @Column({ nullable: true })
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing the media',
    example: ['opening', 'ceremony', 'fireworks']
  })
  @Column('simple-array', { nullable: true })
  tags?: string[];

  @ApiProperty({
    description: 'Original filename of the uploaded media',
    example: 'opening-ceremony.jpg'
  })
  @Column()
  originalFilename: string;

  @ApiProperty({
    description: 'Size of the media file in bytes',
    example: 2048576
  })
  @Column('bigint')
  fileSize: number;

  @ApiProperty({
    description: 'MIME type of the media file',
    example: 'image/jpeg'
  })
  @Column()
  mimeType: string;

  @ApiPropertyOptional({
    description: 'Order/position in the gallery',
    example: 1
  })
  @Column({ default: 0 })
  displayOrder: number;

  @ApiProperty({
    description: 'Whether this item is featured in the gallery',
    example: false
  })
  @Column({ default: false })
  isFeatured: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the gallery item',
    example: {
      width: 1920,
      height: 1080,
      camera: 'Canon EOS R5',
      location: 'Main Stage',
      timestamp: '2025-04-30T20:00:00Z'
    }
  })
  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Date and time when the item was created',
    example: '2025-04-30T10:00:00Z'
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Date and time when the item was last updated',
    example: '2025-04-30T15:30:00Z'
  })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Media dimensions for images and videos',
    example: {
      width: 1920,
      height: 1080,
      duration: null // Duration in seconds for videos
    }
  })
  @Column('json', { nullable: true })
  dimensions?: {
    width: number;
    height: number;
    duration?: number;
  };
}
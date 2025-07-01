import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from './event.entity';

@Entity()
export class GalleryImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string;

  @Column()
  description: string;

  @ManyToOne(() => Event, (event) => event.images, { onDelete: 'CASCADE' })
  event: Event;
} 
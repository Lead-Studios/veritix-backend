import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity()
export class GalleryImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  imageUrl: string;

  @Column()
  description: string;

  @ManyToOne(() => Event, (event) => event.galleryImages, { onDelete: 'CASCADE' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
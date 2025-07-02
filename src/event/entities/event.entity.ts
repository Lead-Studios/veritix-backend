import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { GalleryImage } from './gallery-image.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => GalleryImage, (image) => image.event)
  images: GalleryImage[];
} 
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { GalleryImage } from './gallery-image.entity';
import { Sponsor } from './sponsor.entity';
import { Collaborator } from './collaborator.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @OneToMany(() => GalleryImage, (image) => image.event)
  images: GalleryImage[];

  @OneToMany(() => Sponsor, (sponsor) => sponsor.event)
  sponsors: Sponsor[];

  @OneToMany(() => Collaborator, (collaborator) => collaborator.event)
  collaborators: Collaborator[];
} 
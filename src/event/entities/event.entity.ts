import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { GalleryImage } from './gallery-image.entity';
import { Sponsor } from './sponsor.entity';
import { Collaborator } from './collaborator.entity';
import { Notification } from '../../notification/entities/notification.entity';

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

  @OneToMany(() => Notification, (notification) => notification.event)
  notifications: Notification[];

  @Column('timestamp')
  date: Date;

  @Column()
  country: string;

  @Column()
  state: string;

  @Column()
  street: string;

  @Column()
  localGovernment: string;

  @Column('int')
  ticketQuantity: number;

  @Column()
  capacity: number;

  @Column({ default: true }) // only free events support RSVP
  isFree: boolean;

  @Column({ default: 0 })
  currentRSVPs: number;
}

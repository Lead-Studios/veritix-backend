import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  DeleteDateColumn,
} from "typeorm";
import { Ticket } from "../../tickets/entities/ticket.entity";
import { SpecialGuest } from "../../special-guests/entities/special-guest.entity";
import { Sponsor } from "../../sponsors/sponsor.entity";
import { Poster } from "../../posters/entities/poster.entity";
import { Collaborator } from "../../collaborator/entities/collaborator.entity";
import { EventGallery } from "src/event-gallery/entities/event-gallery.entity";
import { Category } from "src/category/category.entity";

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  eventName: string;

  @Column()
  eventCategory: string;

  @Column({ type: "timestamp" })
  eventDate: Date;

  @Column({ type: "timestamp" })
  eventClosingDate: Date;

  @Column({ type: "text" })
  eventDescription: string;

  @Column()
  country: string;

  @Column()
  state: string;

  @Column()
  street: string;

  @Column()
  localGovernment: string;

  @Column({ nullable: true })
  direction: string;

  @Column({ nullable: true })
  eventImage: string;

  @Column({ default: false })
  hideEventLocation: boolean;

  @Column({ default: false })
  eventComingSoon: boolean;

  @Column({ default: false })
  transactionCharge: boolean;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  accountName: string;

  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  twitter: string;

  @Column({ nullable: true })
  instagram: string;

  @ManyToMany(() => Sponsor, (sponsor) => sponsor.events)
  sponsors: Sponsor[];

  // Relations - Make them optional
  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  @OneToMany(() => SpecialGuest, (specialGuest) => specialGuest.event, {
    nullable: true,
  })
  specialGuests: SpecialGuest[] | null;

  @OneToMany(() => Collaborator, (collaborator) => collaborator.event)
  collaborators: Collaborator[];

  @Column({ default: false })
  isArchived: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Poster, (poster) => poster.event)
  posters: Poster[];

  @OneToMany(() => EventGallery, (eventGallery) => eventGallery.event)
  eventGallery: EventGallery[];

  @ManyToOne(() => Category)
  category: Category;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Ticket } from "../../tickets/entities/ticket.entity";
import { SpecialGuest } from "../../special-guests/entities/special-guest.entity";
import { Sponsor } from "../../sponsors/sponsor.entity";
import { Poster } from "../../posters/entities/poster.entity";
import { Collaborator } from "../../collaborator/entities/collaborator.entity";
import { EventGallery } from "../../event-gallery/entities/event-gallery.entity";
import { Category } from "../../category/category.entity";
import { PricingRule } from "../../dynamic-pricing/pricing/entities/pricing-rule.entity";
import { User } from "../../users/entities/user.entity";
import { EventStatus } from "../../common/enums/event-status.enum";
import { GalleryItem } from "../../event-gallery/entities/gallery-item.entity";

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  title: string;

  @Column()
  eventName: string;

  @Column({ type: "timestamp" })
  eventDate: Date;

  @Column({ type: "timestamp" })
  eventClosingDate: Date;

  @Column({ type: "text" })
  eventDescription: string;

  @Column()
  venue: string;

  @Column()
  address: string;

  @Column()
  street: string;

  @Column()
  capacity: number;

  @Column({ type: "enum", enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ nullable: true })
  cancellationReason: string;

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

  @ManyToOne(() => User, (user) => user.events)
  organizer: User;

  @ManyToMany(() => Sponsor, (sponsor) => sponsor.event)
  sponsors: Sponsor[];

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  @OneToMany(() => SpecialGuest, (specialGuest) => specialGuest.event, {
    nullable: true,
  })
  specialGuests: SpecialGuest[] | null;

  @OneToMany(() => Collaborator, (collaborator) => collaborator.event)
  collaborators: Collaborator[];

  @OneToMany(() => PricingRule, (pricingRule) => pricingRule.event)
  pricingRules: PricingRule[];

  @Column({ default: false })
  isArchived: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Poster, (poster) => poster.event)
  posters: Poster[];

  @OneToMany(() => EventGallery, (eventGallery) => eventGallery.event)
  eventGallery: EventGallery[];

  @ManyToOne(() => Category, (category) => category.events)
  category: Category;
}

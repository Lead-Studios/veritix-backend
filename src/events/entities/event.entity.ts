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
  description: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column()
  venue: string;

  @Column()
  address: string;

  @Column()
  category: string;

  @Column()
  capacity: number;

  @Column({ type: "enum", enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ nullable: true })
  cancellationReason: string;

  @Column({ nullable: true })
  postponementReason: string;

  @Column({ default: false })
  isArchived: boolean;

  @ManyToOne(() => User, (user) => user.events)
  organizer: User;

  @OneToMany(() => GalleryItem, (galleryItem) => galleryItem.event)
  galleryItems: GalleryItem[];

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  @OneToMany(() => SpecialGuest, (specialGuest) => specialGuest.event)
  specialGuests: SpecialGuest[];

  @OneToMany(() => Sponsor, (sponsor) => sponsor.event)
  sponsors: Sponsor[];

  @OneToMany(() => Poster, (poster) => poster.event)
  posters: Poster[];

  @OneToMany(() => Collaborator, (collaborator) => collaborator.event)
  collaborators: Collaborator[];

  @OneToMany(() => PricingRule, (pricingRule) => pricingRule.event)
  pricingRules: PricingRule[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

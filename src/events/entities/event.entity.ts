import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
} from "typeorm";
import { Ticket } from "../../ticket/entities/ticket.entity";
import { SpecialGuest } from "../../special-guest/entities/special-guest.entity";
import { Sponsor } from "../../event/entities/sponsor.entity";
import { Poster } from "../../poster/entities/poster.entity";
import { Collaborator } from "../../event/entities/collaborator.entity";
// import { EventGallery } from "../../event-gallery/entities/event-gallery.entity"; // Not found
// import { Category } from "../../category/category.entity"; // Not found
// import { PricingRule } from "../../dynamic-pricing/pricing/entities/pricing-rule.entity"; // Not found
import { User } from "../../user/entities/user.entity";
// import { EventStatus } from "../../common/enums/event-status.enum"; // Not found
// import { GalleryItem } from "../../event-gallery/entities/gallery-item.entity"; // Not found
import { PromoCode } from "../../ticket/entities/promo-code.entity";
import { EventView } from "../../analytics-event/entities/event-view.entity";
import { PurchaseLog } from "../../analytics-event/entities/purchase-log.entity";
import { TicketTier } from "../../ticket-tier/entities/ticket-tier.entity";
import { GalleryImage } from "../../event/entities/gallery-image.entity";
import { Notification } from "../../notification/entities/notification.entity";

@Entity()
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  country: string;

  @Column()
  state: string;

  @Column()
  street: string;

  @Column()
  localGovernment: string;

  @Column("int")
  ticketQuantity: number;

  // @Column({ type: "enum", enum: EventStatus, default: EventStatus.DRAFT })
  // status: EventStatus;
  @Column({ default: "DRAFT" })
  status: string;

  @OneToMany(() => PromoCode, (promo) => promo.event)
  promoCodes: PromoCode[];

  @Column({ nullable: true })
  cancellationReason: string;

  @ManyToOne(() => User)
  organizer: User;

  @ManyToMany(() => Sponsor, (sponsor) => sponsor.event)
  sponsors: Sponsor[];

  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  @OneToMany(() => SpecialGuest, (specialGuest) => specialGuest.event, { nullable: true })
  specialGuests: SpecialGuest[] | null;

  @OneToMany(() => Collaborator, (collaborator) => collaborator.event)
  collaborators: Collaborator[];

  // @OneToMany(() => PricingRule, (pricingRule) => pricingRule.event)
  // pricingRules: PricingRule[];

  @Column({ default: false })
  isArchived: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  @OneToMany(() => Poster, (poster) => poster.event)
  posters: Poster[];

  // @OneToMany(() => EventGallery, (eventGallery) => eventGallery.event)
  // eventGallery: EventGallery[];

  // @ManyToOne(() => Category, (category) => category.events)
  // category: Category;

  @OneToMany(() => EventView, (view) => view.event)
  views: EventView[];

  @OneToMany(() => PurchaseLog, (log) => log.event)
  purchaseLogs: PurchaseLog[];

  @OneToMany(() => TicketTier, (tier) => tier.event)
  ticketTiers: TicketTier[];

  @OneToMany(() => GalleryImage, (image) => image.event)
  galleryImages: GalleryImage[];

  @OneToMany(() => Notification, (notification) => notification.event)
  notifications: Notification[];

  @Column({ nullable: true })
  ownerId: string;
}

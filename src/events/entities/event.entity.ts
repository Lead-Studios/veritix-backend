import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  DeleteDateColumn,
} from "typeorm";
import { ApiProperty } from '@nestjs/swagger';
import { Ticket } from "../../tickets/entities/ticket.entity";
import { SpecialGuest } from "../../special-guests/entities/special-guest.entity";
import { Sponsor } from "../../sponsors/sponsor.entity";
import { Poster } from "../../posters/entities/poster.entity";
import { Collaborator } from "../../collaborator/entities/collaborator.entity";
import { EventGallery } from "src/event-gallery/entities/event-gallery.entity";
import { Category } from "src/category/category.entity";

@Entity()
export class Event {
  @ApiProperty({
    description: 'Unique identifier of the event',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ApiProperty({
    description: 'Name of the event',
    example: 'Tech Conference 2025'
  })
  @Column()
  eventName: string;

  @ApiProperty({
    description: 'Category of the event',
    example: 'Technology'
  })
  @Column()
  eventCategory: string;

  @ApiProperty({
    description: 'Date and time when the event starts',
    example: '2025-06-15T09:00:00Z'
  })
  @Column({ type: "timestamp" })
  eventDate: Date;

  @ApiProperty({
    description: 'Closing date for event registrations',
    example: '2025-06-14T23:59:59Z'
  })
  @Column({ type: "timestamp" })
  eventClosingDate: Date;

  @ApiProperty({
    description: 'Detailed description of the event',
    example: 'Join us for the biggest tech conference of 2025...'
  })
  @Column({ type: "text" })
  eventDescription: string;

  @ApiProperty({
    description: 'Country where the event is held',
    example: 'United States'
  })
  @Column()
  country: string;

  @ApiProperty({
    description: 'State/Province where the event is held',
    example: 'California'
  })
  @Column()
  state: string;

  @ApiProperty({
    description: 'Street address of the venue',
    example: '123 Tech Boulevard'
  })
  @Column()
  street: string;

  @ApiProperty({
    description: 'Local government area',
    example: 'San Francisco'
  })
  @Column()
  localGovernment: string;

  @ApiProperty({
    description: 'Directions to the venue',
    example: 'Near Downtown Financial District',
    required: false
  })
  @Column({ nullable: true })
  direction: string;

  @ApiProperty({
    description: 'URL of the event image',
    example: 'https://example.com/images/event.jpg',
    required: false
  })
  @Column({ nullable: true })
  eventImage: string;

  @ApiProperty({
    description: 'Whether to hide the event location from public view',
    example: false,
    default: false
  })
  @Column({ default: false })
  hideEventLocation: boolean;

  @ApiProperty({
    description: 'Whether the event is marked as coming soon',
    example: false,
    default: false
  })
  @Column({ default: false })
  eventComingSoon: boolean;

  @ApiProperty({
    description: 'Whether to apply transaction charges',
    example: true,
    default: false
  })
  @Column({ default: false })
  transactionCharge: boolean;

  @ApiProperty({
    description: 'Name of the bank for payments',
    example: 'Example Bank',
    required: false
  })
  @Column({ nullable: true })
  bankName: string;

  @ApiProperty({
    description: 'Bank account number',
    example: '1234567890',
    required: false
  })
  @Column({ nullable: true })
  bankAccountNumber: string;

  @ApiProperty({
    description: 'Name on the bank account',
    example: 'Event Organizer LLC',
    required: false
  })
  @Column({ nullable: true })
  accountName: string;

  @ApiProperty({
    description: 'Facebook page URL',
    example: 'https://facebook.com/event',
    required: false
  })
  @Column({ nullable: true })
  facebook: string;

  @ApiProperty({
    description: 'Twitter profile URL',
    example: 'https://twitter.com/event',
    required: false
  })
  @Column({ nullable: true })
  twitter: string;

  @ApiProperty({
    description: 'Instagram profile URL',
    example: 'https://instagram.com/event',
    required: false
  })
  @Column({ nullable: true })
  instagram: string;

  @ApiProperty({ type: () => [Sponsor] })
  @ManyToMany(() => Sponsor, (sponsor) => sponsor.events)
  sponsors: Sponsor[];

  @ApiProperty({ type: () => [Ticket] })
  @OneToMany(() => Ticket, (ticket) => ticket.event)
  tickets: Ticket[];

  @ApiProperty({ type: () => [SpecialGuest] })
  @OneToMany(() => SpecialGuest, (specialGuest) => specialGuest.event, {
    nullable: true,
  })
  specialGuests: SpecialGuest[] | null;

  @ApiProperty({ type: () => [Collaborator] })
  @OneToMany(() => Collaborator, (collaborator) => collaborator.event)
  collaborators: Collaborator[];

  @ApiProperty({
    description: 'Whether the event is archived',
    example: false,
    default: false
  })
  @Column({ default: false })
  isArchived: boolean;

  @ApiProperty({
    description: 'Deletion date if the event is soft-deleted',
    required: false
  })
  @DeleteDateColumn()
  deletedAt?: Date;

  @ApiProperty({ type: () => [Poster] })
  @OneToMany(() => Poster, (poster) => poster.event)
  posters: Poster[];

  @ApiProperty({ type: () => [EventGallery] })
  @OneToMany(() => EventGallery, (eventGallery) => eventGallery.event)
  eventGallery: EventGallery[];

  @ApiProperty({ type: () => Category })
  @ManyToOne(() => Category)
  category: Category;
}

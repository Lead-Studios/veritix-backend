import { SpecialSpeaker } from "src/special-speaker/entities/special-speaker.entity";
import { Collaborator } from "src/collaborator/entities/collaborator.entity";
import { Ticket } from "src/tickets/entities/ticket.entity";
import { User } from "src/users/entities/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ConferenceGallery } from "src/conference-gallery/entities/conference-gallery.entity";

export enum ConferenceVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
  DRAFT = "draft",
}
@Entity()
export class Conference {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ name: "conference_name" })
  conferenceName: string;

  @Index()
  @Column({ name: "conference_category" })
  conferenceCategory: string;

  @Column({ name: "conference_date", type: "timestamp" })
  conferenceDate: Date;

  @Column({ name: "conference_closing_date", type: "timestamp" })
  conferenceClosingDate: Date;

  @Column({ name: "conference_description", type: "text" })
  conferenceDescription: string;

  @OneToMany(
    () => ConferenceGallery,
    (conferenceGallery) => conferenceGallery.conference,
  )
  conferenceGallery: ConferenceGallery[];

  @Column({
    type: "enum",
    enum: ConferenceVisibility,
    default: ConferenceVisibility.PUBLIC,
  })
  visibility: ConferenceVisibility;

  // Location details
  @Index()
  @Column()
  country: string;

  @Index()
  @Column()
  state: string;

  @Index()
  @Column()
  street: string;

  @Index()
  @Column({ name: "local_government" })
  localGovernment: string;

  @Column({ nullable: true })
  direction: string;

  @Column({ name: "hide_location", default: false })
  hideLocation: boolean;

  // Additional details
  @Column({ name: "coming_soon", default: false })
  comingSoon: boolean;

  @Column({ name: "transaction_charge", default: false })
  transactionCharge: boolean;

  // Bank details
  @Column({ name: "bank_name" })
  bankName: string;

  @Column({ name: "bank_account_number" })
  bankAccountNumber: string;

  @Column({ name: "account_name" })
  accountName: string;

  // Social media (optional)
  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  twitter: string;

  @Column({ nullable: true })
  instagram: string;

  @Column({ type: "uuid", nullable:true })
  organizerId: string; // This will hold the ID of the organizer (User)

  @ManyToOne(() => User, (user) => user.conferences) // Assuming you have a User entity
  @JoinColumn({ name: "organizerId" })
  organizer: User; // You can also define a relationship to the User entity (optional)

  // One-to-many relation to tickets
  @OneToMany(() => Ticket, (ticket) => ticket.conference)
  tickets: Ticket[];

  @OneToMany(() => Collaborator, (collaborator) => collaborator.conference)
  collaborators: Collaborator[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => SpecialSpeaker, (speaker) => speaker.conference)
  specialSpeakers: SpecialSpeaker[];
}

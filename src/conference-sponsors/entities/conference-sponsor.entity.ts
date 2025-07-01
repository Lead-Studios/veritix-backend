import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Conference } from "./../../conference/entities/conference.entity";

@Entity("conference_sponsors")
export class ConferenceSponsor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "brand_name" })
  brandName: string;

  @Column({ name: "brand_website" })
  brandWebsite: string;

  @Column({ name: "brand_image" })
  brandImage: string;

  @Column({ name: "conference_id" })
  conferenceId: string;

  // Social media links (optional)
  @Column({ nullable: true })
  facebook: string;

  @Column({ nullable: true })
  twitter: string;

  @Column({ nullable: true })
  instagram: string;

  @ManyToOne(() => Conference, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conference_id" })
  conference: Conference;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

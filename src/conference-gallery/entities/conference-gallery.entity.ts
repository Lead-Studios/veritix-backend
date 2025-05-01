import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Conference } from "../../conference/entities/conference.entity";

@Entity()
export class ConferenceGallery {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  imageUrl: string;

  @Column()
  description: string;

  @ManyToOne(() => Conference, (conference) => conference.conferenceGallery, {
    onDelete: "CASCADE",
  })
  conference: Conference;

  @Column()
  conferenceId: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}

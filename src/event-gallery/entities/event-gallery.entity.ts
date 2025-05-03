import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Event } from "../../events/entities/event.entity";

@Entity()
export class EventGallery {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  imageUrl: string;

  @Column()
  description: string;

  @ManyToOne(() => Event, (event) => event.galleryItems, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "eventId" })
  event: Event;

  @Column()
  eventId: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;
}

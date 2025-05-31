import { User } from "src/users/entities/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Event } from "src/events/entities/event.entity";

@Entity("waitlist_entries")
@Index(["eventId", "createdAt"])
export class WaitlistEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  eventId: string;

  @Column({ nullable: true })
  email: string; // For notification purposes

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Event)
  event: Event;
}

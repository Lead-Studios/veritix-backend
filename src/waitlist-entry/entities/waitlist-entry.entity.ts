import { User } from 'src/user/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from 'src/event/entities/event.entity';

@Entity('waitlist_entries')
@Index(['eventId', 'createdAt']) // For efficient querying by event and timestamp
@Index(['userId', 'eventId'], { unique: true }) // Prevent duplicate entries per user per event
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  eventId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: false })
  notified: boolean;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;
}

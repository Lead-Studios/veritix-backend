import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Attendee } from './attendee.entity';

@Entity()
export class SessionCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sessionId: string;

  @Column()
  sessionName: string;

  @ManyToOne(() => Attendee, (attendee) => attendee.sessionCheckIns)
  attendee: Attendee;

  @Column()
  attendeeId: string;

  @CreateDateColumn()
  checkedInAt: Date;

  @Column({ default: false })
  isCheckedIn: boolean;
}

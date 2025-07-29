import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  attendeeId: string;

  @Column({ type: 'varchar', length: 255 })
  attendeeName: string;

  @Column({ type: 'varchar', length: 255 })
  attendeeEmail: string;

  @Column({ type: 'timestamp' })
  checkedInAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkedOutAt: Date;

  @ManyToOne(() => Session, (session) => session.attendances)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Session } from './session.entity';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'uuid' })
  attendeeId: string;

  @Column({ type: 'int', width: 1 })
  rating: number; // 1-5 scale

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => Session, (session) => session.feedbacks)
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @CreateDateColumn()
  createdAt: Date;
}

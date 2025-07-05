import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Session } from './session.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class SessionFeedback {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Session, { eager: true })
  session: Session;

  @ManyToOne(() => User, { eager: true })
  attendee: User;

  @Column({ type: 'int', nullable: true })
  rating?: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;
}

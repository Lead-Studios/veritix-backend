import { Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Session } from './session.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class AttendeeSession {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { eager: true })
  attendee: User;

  @ManyToOne(() => Session, { eager: true })
  session: Session;
}

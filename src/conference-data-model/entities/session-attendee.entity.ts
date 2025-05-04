import { Entity, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Session } from './session.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class SessionAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Session, session => session.attendees)
  session: Session;

  @ManyToOne(() => User)
  user: User;

  @Column({ default: false })
  attended: boolean;

  @Column({ nullable: true })
  registeredAt: Date;
}
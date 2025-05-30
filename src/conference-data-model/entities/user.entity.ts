import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { SessionAttendee } from '../../conference-data-model/entities/session-attendee.entity';
import { ConferenceTicket } from '../../conference-data-model/entities/conference-ticket.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @OneToMany(() => SessionAttendee, sessionAttendee => sessionAttendee.user)
  sessionAttendees: SessionAttendee[];

  @OneToMany(() => ConferenceTicket, ticket => ticket.owner)
  conferenceTickets: ConferenceTicket[];
}
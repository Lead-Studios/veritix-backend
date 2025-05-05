import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from './session.entity';
import { Track } from './track.entity';
import { ConferenceTicket } from './conference-ticket.entity';

@Entity()
export class Conference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ nullable: true })
  venue: string;

  @Column({ nullable: true })
  location: string;

  @Column({ default: false })
  published: boolean;

  @OneToMany(() => Session, session => session.conference, { cascade: true })
  sessions: Session[];

  @OneToMany(() => Track, track => track.conference, { cascade: true })
  tracks: Track[];

  @OneToMany(() => ConferenceTicket, ticket => ticket.conference)
  tickets: ConferenceTicket[];
}
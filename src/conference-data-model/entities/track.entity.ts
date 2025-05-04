import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Conference } from './conference.entity';
import { Session } from './session.entity';

@Entity()
export class Track {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => Conference, conference => conference.tracks)
  conference: Conference;

  @OneToMany(() => Session, session => session.track)
  sessions: Session[];
}
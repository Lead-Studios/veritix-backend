import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Conference } from './conference.entity';
import { Session } from './session.entity';

@Entity()
export class Track {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Conference, conference => conference.tracks)
  conference: Conference;

  @OneToMany(() => Session, session => session.track)
  sessions: Session[];
}

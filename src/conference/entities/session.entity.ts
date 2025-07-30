import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Conference } from './conference.entity';
import { Speaker } from './speaker.entity';
import { Track } from './track.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column()
  room: string;

  @ManyToOne(() => Conference, (conference) => conference.sessions)
  conference: Conference;

  @ManyToOne(() => Track, (track) => track.sessions, { nullable: true })
  track?: Track;

  @ManyToMany(() => Speaker, (speaker) => speaker.sessions)
  @JoinTable()
  speakers: Speaker[];
}

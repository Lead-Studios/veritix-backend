import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Conference } from './conference.entity';

@Entity()
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'datetime' })
  startTime: Date;

  @Column({ type: 'datetime' })
  endTime: Date;

  @Column({ nullable: true })
  room: string;

  @ManyToOne(() => Conference, (conference) => conference.sessions)
  conference: Conference;
}
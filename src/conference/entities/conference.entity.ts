import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Session } from './session.entity';
import { Track } from './track.entity';

@Entity()
export class Conference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @OneToMany(() => Session, (session) => session.conference)
  sessions: Session[];

  @OneToMany(() => Track, (track) => track.conference, { nullable: true })
  tracks?: Track[];
}

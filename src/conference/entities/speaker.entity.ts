import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Session } from './session.entity';

@Entity()
export class Speaker {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ nullable: true })
  headshotUrl?: string;

  @ManyToMany(() => Session, (session) => session.speakers)
  sessions: Session[];
}

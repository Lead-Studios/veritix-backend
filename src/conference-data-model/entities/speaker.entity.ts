import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from './session.entity';

@Entity()
export class Speaker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  headshot: string;

  @ManyToMany(() => Session, session => session.speakers)
  sessions: Session[];
}
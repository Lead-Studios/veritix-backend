import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Session } from './session.entity';

@Entity()
export class Conference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  startDate: Date;

  @Column()
  endDate: Date;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: '#FFFFFF' })
  primaryColor: string;

  @Column({ default: '#000000' })
  secondaryColor: string;

  @OneToMany(() => Session, (session) => session.conference)
  sessions: Session[];
}
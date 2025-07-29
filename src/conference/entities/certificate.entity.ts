import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Conference } from './conference.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Certificate {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Conference, { eager: true })
  conference: Conference;

  @ManyToOne(() => User, { eager: true })
  attendee: User;

  @Column({ nullable: true })
  fileUrl?: string;
}

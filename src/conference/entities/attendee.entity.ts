import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SessionCheckIn } from './session-check-in.entity';

@Entity()
export class Attendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  company?: string;

  @Column()
  email: string;

  @Column()
  ticketType: string; // e.g., VIP, Regular, SPEAKER

  @OneToMany(() => SessionCheckIn, (sessionCheckIn) => sessionCheckIn.attendee)
  sessionCheckIns: SessionCheckIn[];
}

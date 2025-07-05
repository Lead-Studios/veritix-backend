import { Column, OneToMany } from "typeorm";

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

  @OneToMany(() => SessionCheckIn, session => session.attendee)
  sessions: SessionCheckIn[];
}
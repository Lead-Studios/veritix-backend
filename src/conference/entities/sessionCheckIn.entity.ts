import { Session } from "inspector/promises";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Attendee } from "./attendee.entity";

@Entity()
export class SessionCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Attendee, attendee => attendee.sessions)
  attendee: Attendee;

  @ManyToOne(() => Session)
  session: Session;

  @Column()
  checkInTime: Date;
}
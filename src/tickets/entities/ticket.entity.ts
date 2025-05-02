import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from "typeorm";
import { Event } from "../../events/entities/event.entity";
import { Conference } from "src/conference/entities/conference.entity";

@Entity()
@Index(['conferenceId'])
@Index(['purchaseDate'])
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => Event, (event) => event.tickets, { onDelete: "CASCADE" })
  @JoinColumn({ name: "eventId" })
  event: Event;

  @Column()
  eventId: string;
  
  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  price: number;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "timestamp" })
  deadlineDate: Date;

  @Column({ default: false })
  isReserved: boolean;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ nullable: true })
  transactionId: string;

  @CreateDateColumn()
  purchaseDate: Date;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => Conference, (conference) => conference.tickets)
  @JoinColumn({ name: 'conferenceId' })
  conference: Conference;

  @Column()
  conferenceId: number;
}
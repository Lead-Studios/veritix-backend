import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn
} from "typeorm"
import { TicketTier } from "../../tickets/entities/ticket-tier.entity"

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  description: string

  @Column()
  location: string

  @Column()
  startTime: Date

  @Column()
  endTime: Date

  // @OneToMany(
  //     () => TicketTier,
  //     (ticketTier) => ticketTier.event,
  //   )
  //   ticketTiers: TicketTier[]
  }

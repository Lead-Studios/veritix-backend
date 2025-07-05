import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
import { Ticket } from "./ticket.entity"

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  name: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ type: "timestamp" })
  startDate: Date

  @Column({ type: "timestamp" })
  endDate: Date

  @Column({ type: "varchar", length: 255 })
  location: string

  @Column({ type: "uuid" })
  organizerId: string

  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  ticketPrice: number

  @Column({ type: "int", default: 0 })
  maxCapacity: number

  @Column({ type: "boolean", default: true })
  isActive: boolean

  @OneToMany(
    () => Ticket,
    (ticket) => ticket.event,
  )
  tickets: Ticket[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

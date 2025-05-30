import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from "typeorm"
import { Conference } from "./conference.entity"

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column()
  description: string

  @Column()
  speakerName: string

  @Column({ nullable: true })
  speakerBio: string

  @Column({ type: "timestamp" })
  startTime: Date

  @Column({ type: "timestamp" })
  endTime: Date

  @Column()
  room: string

  @Column({ default: 0 })
  maxAttendees: number

  @Column({ type: "uuid" })
  conferenceId: string

  @ManyToOne(
    () => Conference,
    (conference) => conference.sessions,
  )
  @JoinColumn({ name: "conferenceId" })
  conference: Conference

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date
}

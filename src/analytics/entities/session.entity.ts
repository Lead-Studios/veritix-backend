import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm"
// import { Conference } from "./conference.entity"
import { Attendance } from "./attendance.entity"
import { Feedback } from "./feedback.entity"

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ type: "varchar", length: 255 })
  speakerName: string

  @Column({ type: "varchar", length: 255, nullable: true })
  track: string

  @Column({ type: "timestamp" })
  scheduledStartTime: Date

  @Column({ type: "timestamp" })
  scheduledEndTime: Date

  @Column({ type: "timestamp", nullable: true })
  actualStartTime: Date

  @Column({ type: "timestamp", nullable: true })
  actualEndTime: Date

  @Column({ type: "int", default: 0 })
  capacity: number

  @Column({ type: "uuid" })
  conferenceId: string

  @ManyToOne(
    "Conference",
    (conference: any) => conference.sessions,
  )
  @JoinColumn({ name: "conferenceId" })
  conference: any

  @OneToMany(
    () => Attendance,
    (attendance) => attendance.session,
  )
  attendances: Attendance[]

  @OneToMany(
    () => Feedback,
    (feedback) => feedback.session,
  )
  feedbacks: Feedback[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

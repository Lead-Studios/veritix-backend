import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity("attendees")
export class Attendee {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column()
  email: string

  @Column({ nullable: true })
  company: string

  @Column({ nullable: true })
  jobTitle: string

  @Column({ nullable: true })
  profileImageUrl: string

  @Column({ type: "uuid" })
  conferenceId: string

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date
}

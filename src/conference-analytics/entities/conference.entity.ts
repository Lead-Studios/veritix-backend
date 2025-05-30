import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm"
import { Session } from "./session.entity"

@Entity("conferences")
export class Conference {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column()
  description: string

  @Column()
  location: string

  @Column()
  organizerId: string

  @Column({ type: "timestamp" })
  startDate: Date

  @Column({ type: "timestamp" })
  endDate: Date

  @Column({ default: false })
  isPublished: boolean

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" })
  updatedAt: Date

  @OneToMany(
    () => Session,
    (session) => session.conference,
    { cascade: true },
  )
  sessions: Session[]
}

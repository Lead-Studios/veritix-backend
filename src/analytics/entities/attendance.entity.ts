import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from "typeorm"
import { Session } from "../../conference/entities/session.entity"

@Entity("attendances")
export class Attendance {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  sessionId: string

  @Column({ type: "uuid" })
  attendeeId: string

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  checkedInAt: Date

  @ManyToOne(() => Session)
  @JoinColumn({ name: "sessionId" })
  session: Session
}

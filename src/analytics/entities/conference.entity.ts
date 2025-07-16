import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm"
// import { Session } from "./session.entity"

@Entity("conferences")
export class Conference {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  name: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ type: "date" })
  startDate: Date

  @Column({ type: "date" })
  endDate: Date

  @Column({ type: "varchar", length: 255 })
  location: string

  @Column({ type: "uuid" })
  organizerId: string

  @OneToMany(
    "Session",
    (session: any) => session.conference,
  )
  sessions: any[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}

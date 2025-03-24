import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne } from "typeorm"
import { Event } from "../../events/entities/event.entity"

@Entity()
export class Poster {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  imageUrl: string

  @Column()
  description: string

  @Column()
  eventId: string

  @ManyToOne(
    () => Event,
    (event) => event.posters,
  )
  event: Event

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}


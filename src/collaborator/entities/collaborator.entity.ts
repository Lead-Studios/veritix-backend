import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { Event } from "../../events/entities/event.entity";

@Entity()
export class Collaborator {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  imageUrl: string;

  @ManyToOne(() => Event, (event) => event.collaborators)
  event: Event;

  @Column()
  eventId: string;
}

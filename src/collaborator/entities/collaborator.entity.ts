import { Conference } from 'src/conference/entities/conference.entity';
import { Event } from 'src/events/entities/event.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('collaborators')
@Unique(['email', 'conference']) // Ensure email is unique per conference
export class Collaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  image: string;

  @ManyToOne(() => Conference, conference => conference.collaborators, {
    onDelete: 'CASCADE',
  })
  conference: Conference;

  //Event
  @ManyToOne(() => Event, event => event.collaborators, {
    onDelete: 'CASCADE',
  })
  event: Event;

  @Column()
  conferenceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity()
export class Collaborator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  image: string;

  @Column()
  email: string;

  @ManyToOne(() => Event, (event) => event.collaborators, { onDelete: 'CASCADE' })
  event: Event;
} 
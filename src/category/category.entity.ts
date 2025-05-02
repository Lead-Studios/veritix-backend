import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Event } from '../events/entities/event.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;


  @Column({ nullable: true })
  icon?: string;


  @OneToMany(() => Event, event => event.category)
  events: Event[];
}

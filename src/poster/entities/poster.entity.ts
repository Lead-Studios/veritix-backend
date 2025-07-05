import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Event } from '../../event/entities/event.entity';

@Entity()
export class Poster {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  image: string;

  @Column('text')
  description: string;

  @ManyToOne(() => Event, { eager: true, onDelete: 'CASCADE' })
  event: Event;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Section } from './section.entity';

@Entity('seat_maps')
export class SeatMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  venueName: string;

  @Column({ type: 'int' })
  totalCapacity: number;

  @Column({ type: 'json', nullable: true })
  layout: {
    width: number;
    height: number;
    orientation?: 'landscape' | 'portrait';
    stage?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Event, (event) => event.seatMaps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @OneToMany(() => Section, (section) => section.seatMap, { cascade: true })
  sections: Section[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

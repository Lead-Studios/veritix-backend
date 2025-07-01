import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Event } from '../../event/entities/event.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @ManyToOne(() => Event, { eager: true, onDelete: 'CASCADE' })
  event: Event;

  @ManyToOne(() => User, { eager: true, nullable: true })
  createdBy: User;

  @Column('int')
  quantity: number;

  @Column('decimal')
  price: number;

  @Column('text')
  description: string;

  @Column('timestamp')
  deadlineDate: Date;

  @Column({ default: false })
  isReserved: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 
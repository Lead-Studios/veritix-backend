import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Event } from '../event/event.entity';
import { User } from '../../user/user.entity';

export enum RevenueShareType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

@Entity()
export class RevenueShareRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, event => event.id, { eager: true })
  event: Event;

  @ManyToOne(() => User, user => user.id, { eager: true })
  stakeholder: User;

  @Column({
    type: 'enum',
    enum: RevenueShareType,
    default: RevenueShareType.PERCENTAGE,
  })
  shareType: RevenueShareType;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  shareValue: number; // Percentage (0-100) or fixed amount

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
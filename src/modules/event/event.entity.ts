import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/user.entity';
import { RevenueShareRule } from '../../modules/revenue-sharing/revenue-sharing.entity';

@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column()
  location: string;

  @Column({ type: 'timestamp' })
  startDate: Date;

  @Column({ type: 'timestamp' })
  endDate: Date;

  @Column({ type: 'int' })
  capacity: number;

  @ManyToOne(() => User, user => user.id, { eager: true })
  organizer: User;

  @OneToMany(() => RevenueShareRule, rule => rule.event)
  revenueShareRules: RevenueShareRule[];
}
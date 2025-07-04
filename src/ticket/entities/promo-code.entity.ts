import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from '../../event/entities/event.entity';

@Entity()
export class PromoCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column('decimal')
  discount: number; // e.g. 0.15 for 15% off

  @Column('int')
  maxUses: number;

  @Column('int', { default: 0 })
  used: number;

  @Column('timestamp')
  expiresAt: Date;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  event: Event;
}

// src/promo-code/promo-code.entity.ts
import { Event } from 'src/events/entities/event.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class PromoCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  code: string;

  @Column()
  discount: number; // e.g. 10 means 10% discount

  @Column()
  maxUses: number;

  @Column({ default: 0 })
  uses: number;

  @Column()
  expiresAt: Date;

  @ManyToOne(() => Event, event => event.promoCodes, { onDelete: 'CASCADE' })
  event: Event;
}

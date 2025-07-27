// src/checkout/entities/checkout-session.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class CheckoutSession {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  userId?: string;

  @Column()
  sessionId: string;

  @Column()
  startedAt: Date;

  @Column({ nullable: true })
  completedAt?: Date;

  @Column({ default: false })
  completed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

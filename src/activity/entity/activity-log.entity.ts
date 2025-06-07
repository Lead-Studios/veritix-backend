// src/activity-log/activity-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("activity_log")
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  type: string; // e.g., 'CLICK', 'CHECKOUT_ATTEMPT', 'PURCHASE'

  @Column("jsonb") // Use 'json' or 'jsonb' depending on your DB
  metadata: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;
}

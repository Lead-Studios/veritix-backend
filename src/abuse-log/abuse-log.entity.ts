import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('abuse_logs')
export class AbuseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  endpoint: string;

  @Column()
  ip: string;

  @Column()
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}

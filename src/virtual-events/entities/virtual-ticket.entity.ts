import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { VirtualEvent } from './virtual-event.entity';
import { User } from '../../user/entities/user.entity';
import { AccessLevel } from '../enums/virtual-event.enum';

@Entity()
export class VirtualTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ticketNumber: string;

  @Column({ type: 'enum', enum: AccessLevel, default: AccessLevel.TICKET_HOLDERS })
  accessLevel: AccessLevel;

  @Column({ nullable: true })
  streamingUrl: string;

  @Column({ nullable: true })
  accessToken: string;

  @Column({ type: 'timestamp', nullable: true })
  validFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ default: false })
  allowRecordingAccess: boolean;

  @Column({ default: false })
  allowBreakoutRooms: boolean;

  @Column({ default: false })
  allowNetworking: boolean;

  @Column({ default: false })
  allowQA: boolean;

  @Column({ default: false })
  allowPolls: boolean;

  @Column({ default: false })
  allowChat: boolean;

  @Column({ default: false })
  isVIP: boolean;

  @Column({ default: false })
  canModerate: boolean;

  @Column({ default: false })
  canPresent: boolean;

  @Column({ default: 1 })
  maxConcurrentSessions: number;

  @Column({ default: 0 })
  currentSessions: number;

  @Column({ type: 'json', nullable: true })
  permissions: Record<string, boolean>;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isUsed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  firstUsedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ default: 0 })
  usageCount: number;

  @ManyToOne(() => VirtualEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'virtualEventId' })
  virtualEvent: VirtualEvent;

  @Column()
  virtualEventId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

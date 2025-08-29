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
import { NetworkingStatus } from '../enums/virtual-event.enum';

@Entity()
export class VirtualEventAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', nullable: true })
  joinedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ default: 0 })
  totalDuration: number; // in seconds

  @Column({ default: false })
  isHost: boolean;

  @Column({ default: false })
  isModerator: boolean;

  @Column({ default: false })
  isPresenter: boolean;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ default: false })
  isVideoOff: boolean;

  @Column({ default: false })
  isHandRaised: boolean;

  @Column({ type: 'enum', enum: NetworkingStatus, default: NetworkingStatus.AVAILABLE })
  networkingStatus: NetworkingStatus;

  @Column({ type: 'json', nullable: true })
  permissions: Record<string, boolean>;

  @Column({ type: 'json', nullable: true })
  deviceInfo: Record<string, any>;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  connectionQuality: string;

  @Column({ default: 0 })
  messagesCount: number;

  @Column({ default: 0 })
  pollsParticipated: number;

  @Column({ default: 0 })
  questionsAsked: number;

  @Column({ default: 0 })
  reactionsCount: number;

  @Column({ type: 'json', nullable: true })
  engagementMetrics: Record<string, any>;

  @Column({ nullable: true })
  breakoutRoomId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastActivity: Date;

  @ManyToOne(() => VirtualEvent, (virtualEvent) => virtualEvent.attendees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'virtualEventId' })
  virtualEvent: VirtualEvent;

  @Column()
  virtualEventId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  guestName: string; // For non-registered attendees

  @Column({ nullable: true })
  guestEmail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

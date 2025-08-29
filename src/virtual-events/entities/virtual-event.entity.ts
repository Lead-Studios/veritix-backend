import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../user/entities/user.entity';
import {
  EventType,
  StreamingPlatform,
  VirtualEventStatus,
  AccessLevel,
  RecordingStatus,
} from '../enums/virtual-event.enum';

@Entity()
export class VirtualEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EventType, default: EventType.VIRTUAL })
  eventType: EventType;

  @Column({ type: 'enum', enum: StreamingPlatform })
  streamingPlatform: StreamingPlatform;

  @Column({ type: 'enum', enum: VirtualEventStatus, default: VirtualEventStatus.SCHEDULED })
  status: VirtualEventStatus;

  @Column({ type: 'enum', enum: AccessLevel, default: AccessLevel.TICKET_HOLDERS })
  accessLevel: AccessLevel;

  @Column({ nullable: true })
  streamUrl: string;

  @Column({ nullable: true })
  streamKey: string;

  @Column({ nullable: true })
  meetingId: string;

  @Column({ nullable: true })
  meetingPassword: string;

  @Column({ nullable: true })
  webinarId: string;

  @Column({ type: 'json', nullable: true })
  platformCredentials: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  streamingSettings: Record<string, any>;

  @Column({ default: true })
  allowChat: boolean;

  @Column({ default: true })
  allowPolls: boolean;

  @Column({ default: true })
  allowQA: boolean;

  @Column({ default: false })
  allowBreakoutRooms: boolean;

  @Column({ default: false })
  allowNetworking: boolean;

  @Column({ default: false })
  allowRecording: boolean;

  @Column({ type: 'enum', enum: RecordingStatus, default: RecordingStatus.NOT_STARTED })
  recordingStatus: RecordingStatus;

  @Column({ nullable: true })
  recordingUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  recordingStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  recordingEndedAt: Date;

  @Column({ default: 0 })
  maxAttendees: number;

  @Column({ default: 0 })
  currentAttendees: number;

  @Column({ default: 0 })
  peakAttendees: number;

  @Column({ default: 0 })
  totalViews: number;

  @Column({ type: 'json', nullable: true })
  waitingRoomSettings: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  moderationSettings: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  brandingSettings: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  analyticsData: Record<string, any>;

  @Column({ type: 'timestamp', nullable: true })
  scheduledStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledEndTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  @Column({ nullable: true })
  timeZone: string;

  @Column({ default: false })
  isLive: boolean;

  @Column({ default: false })
  isRecorded: boolean;

  @Column({ default: false })
  allowOnDemandAccess: boolean;

  @Column({ type: 'timestamp', nullable: true })
  onDemandAvailableUntil: Date;

  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @OneToMany('VirtualEventAttendee', 'virtualEvent')
  attendees: any[];

  @OneToMany('VirtualEventInteraction', 'virtualEvent')
  interactions: any[];

  @OneToMany('BreakoutRoom', 'virtualEvent')
  breakoutRooms: any[];

  @OneToMany('VirtualEventRecording', 'virtualEvent')
  recordings: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

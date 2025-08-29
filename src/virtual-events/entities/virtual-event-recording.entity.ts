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
import { RecordingStatus, AccessLevel } from '../enums/virtual-event.enum';

@Entity()
export class VirtualEventRecording {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RecordingStatus, default: RecordingStatus.NOT_STARTED })
  status: RecordingStatus;

  @Column({ type: 'enum', enum: AccessLevel, default: AccessLevel.TICKET_HOLDERS })
  accessLevel: AccessLevel;

  @Column({ nullable: true })
  recordingUrl: string;

  @Column({ nullable: true })
  downloadUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ default: 0 })
  duration: number; // in seconds

  @Column({ default: 0 })
  fileSize: number; // in bytes

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  quality: string;

  @Column({ type: 'timestamp', nullable: true })
  recordingStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  recordingEndedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processingStartedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processingCompletedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  availableUntil: Date;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  downloadCount: number;

  @Column({ type: 'json', nullable: true })
  chapters: Record<string, any>[];

  @Column({ type: 'json', nullable: true })
  transcription: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  analytics: Record<string, any>;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: false })
  allowDownload: boolean;

  @Column({ default: false })
  hasTranscription: boolean;

  @Column({ default: false })
  hasChapters: boolean;

  @Column({ type: 'json', nullable: true })
  processingSettings: Record<string, any>;

  @ManyToOne(() => VirtualEvent, (virtualEvent) => virtualEvent.recordings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'virtualEventId' })
  virtualEvent: VirtualEvent;

  @Column()
  virtualEventId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

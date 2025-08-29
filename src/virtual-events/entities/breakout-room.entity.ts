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
import { VirtualEvent } from './virtual-event.entity';
import { User } from '../../user/entities/user.entity';
import { BreakoutRoomStatus } from '../enums/virtual-event.enum';

@Entity()
export class BreakoutRoom {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: BreakoutRoomStatus, default: BreakoutRoomStatus.AVAILABLE })
  status: BreakoutRoomStatus;

  @Column({ default: 10 })
  maxParticipants: number;

  @Column({ default: 0 })
  currentParticipants: number;

  @Column({ nullable: true })
  roomUrl: string;

  @Column({ nullable: true })
  roomPassword: string;

  @Column({ type: 'json', nullable: true })
  roomSettings: Record<string, any>;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ default: false })
  requiresApproval: boolean;

  @Column({ type: 'timestamp', nullable: true })
  scheduledStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  scheduledEndTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime: Date;

  @Column({ default: 0 })
  totalDuration: number; // in seconds

  @Column({ type: 'json', nullable: true })
  participantsList: string[];

  @Column({ type: 'json', nullable: true })
  waitingList: string[];

  @Column({ type: 'json', nullable: true })
  moderators: string[];

  @ManyToOne(() => VirtualEvent, (virtualEvent) => virtualEvent.breakoutRooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'virtualEventId' })
  virtualEvent: VirtualEvent;

  @Column()
  virtualEventId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @OneToMany('BreakoutRoomParticipant', 'breakoutRoom')
  participants: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

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
import { InteractionType } from '../enums/virtual-event.enum';

@Entity()
export class VirtualEventInteraction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: InteractionType })
  type: InteractionType;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: false })
  isModerated: boolean;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ default: false })
  isHighlighted: boolean;

  @Column({ default: false })
  isAnonymous: boolean;

  @Column({ nullable: true })
  parentId: string; // For replies

  @Column({ default: 0 })
  likesCount: number;

  @Column({ default: 0 })
  repliesCount: number;

  @Column({ type: 'timestamp', nullable: true })
  moderatedAt: Date;

  @Column({ nullable: true })
  moderatedBy: string;

  @Column({ nullable: true })
  moderationNote: string;

  @ManyToOne(() => VirtualEvent, (virtualEvent) => virtualEvent.interactions, { onDelete: 'CASCADE' })
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
  guestName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt?: Date;
}

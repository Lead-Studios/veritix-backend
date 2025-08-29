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
import { CheckInType } from '../enums/virtual-event.enum';

@Entity()
export class HybridCheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: CheckInType })
  checkInType: CheckInType;

  @Column({ type: 'timestamp' })
  checkInTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOutTime: Date;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  deviceId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ type: 'json', nullable: true })
  geolocation: Record<string, any>;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  qrCodeData: string;

  @Column({ nullable: true })
  nfcData: string;

  @Column({ type: 'json', nullable: true })
  biometricData: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  deviceInfo: Record<string, any>;

  @Column({ nullable: true })
  verificationMethod: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

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

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { VerificationStatus } from '../interfaces/verification.interface';

/**
 * VerificationLog Entity
 *
 * Persists verification attempts for audit purposes.
 * Tracks when tickets are scanned, by whom, and the result status.
 */
@Entity('verification_logs')
@Index(['eventId'])
@Index(['ticketCode'])
@Index(['ticketId'])
@Index(['verifiedAt'])
@Index(['eventId', 'verifiedAt'])
export class VerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    comment: 'The ticket code/QR code that was verified',
  })
  ticketCode: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'The ticket ID (if found)',
  })
  ticketId: string | null;

  @Column({
    type: 'varchar',
    comment: 'The event ID',
  })
  eventId: string;

  @Column({
    type: 'enum',
    enum: VerificationStatus,
    comment: 'The verification result status',
  })
  status: VerificationStatus;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'ID of the staff member who performed verification',
  })
  verifierId: string | null;

  @Column({
    type: 'timestamp',
    comment: 'Verification timestamp',
  })
  verifiedAt: Date;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: 'Device/location information',
  })
  deviceInfo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Event, {
    onDelete: 'CASCADE',
    eager: false,
  })
  event: Event;
}

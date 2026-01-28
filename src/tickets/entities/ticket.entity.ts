import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../auth/entities/user.entity';
import { TicketType } from './ticket-type.entity';
import { TicketVerificationStatus } from '../enums/ticket-verification-status.enum';
import { BlockchainAnchorStatus } from '../../blockchain/enums';

@Entity()
@Index(['ownerId'])
@Index(['eventId'])
@Index(['ticketTypeId'])
@Index(['verificationStatus'])
@Unique(['eventId', 'serialNumber'])
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unambiguous ownership: exactly one current owner (User.id is int in this repo)
   */
  @Column('int')
  ownerId: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  /**
   * Ticket belongs to an event (Event.id is uuid)
   */
  @Column('uuid')
  eventId: string;

  @ManyToOne(() => Event, (event) => event.tickets, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  /**
   * Ticket type determines constraints
   */
  @Column('uuid')
  ticketTypeId: string;

  @ManyToOne(() => TicketType, (tt) => tt.tickets, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  /**
   * Useful for QR/display without exposing UUID
   */
  @Column('varchar', { length: 64 })
  serialNumber: string;

  /**
   * Verification state (no verification logic yet)
   */
  @Column({
    type: 'enum',
    enum: TicketVerificationStatus,
    default: TicketVerificationStatus.UNVERIFIED,
  })
  verificationStatus: TicketVerificationStatus;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  /**
   * Resale/transfer tracking (no transfer logic yet)
   */
  @Column({ type: 'int', default: 0 })
  transferCount: number;

  // =====================================
  // BLOCKCHAIN ANCHORING FIELDS
  // These fields enable blockchain integration without tight coupling
  // =====================================

  /**
   * Blockchain anchor hash for ticket verification
   * null = not anchored, string = anchored to blockchain
   */
  @Column('varchar', { length: 255, nullable: true })
  blockchainAnchorHash: string | null;

  /**
   * Blockchain transaction ID for this ticket
   */
  @Column('varchar', { length: 255, nullable: true })
  blockchainTransactionId: string | null;

  /**
   * Status of blockchain anchoring operation
   */
  @Column({
    type: 'enum',
    enum: BlockchainAnchorStatus,
    nullable: true,
  })
  blockchainStatus: BlockchainAnchorStatus | null;

  /**
   * Timestamp when ticket was anchored to blockchain
   */
  @Column({ type: 'timestamp', nullable: true })
  blockchainAnchoredAt: Date | null;

  /**
   * Last time blockchain anchor was verified
   */
  @Column({ type: 'timestamp', nullable: true })
  blockchainVerifiedAt: Date | null;

  /**
   * Legacy: Future blockchain anchor reference (tx hash / token id / etc.)
   * No blockchain logic implemented.
   */
  @Column('varchar', { length: 150, nullable: true })
  blockchainAnchorRef?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

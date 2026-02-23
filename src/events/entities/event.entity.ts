import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  DeleteDateColumn,
  OneToMany,
  ManyToOne, JoinColumn, Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventStatus } from '../../enums/event-status.enum';
import { BlockchainAnchorStatus } from '../../blockchain/enums';
import { TicketType } from '../../tickets-inventory/entities/ticket-type.entity';
import { Ticket } from '../../tickets-inventory/entities/ticket.entity';
import { User } from '../../auth/entities/user.entity';


@Entity()
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'timestamp' })
  eventDate: Date;

  @Column({ type: 'timestamp' })
  eventClosingDate: Date;

  @Column({ type: 'text' })
  description: string;

  @Column()
  capacity: number;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ default: false })
  isArchived: boolean;

  @DeleteDateColumn()
  deletedAt?: Date;

  // =====================================
  // BLOCKCHAIN ANCHORING FIELDS
  // These fields enable blockchain integration without tight coupling
  // =====================================

  /**
   * Blockchain anchor hash for event verification
   * null = not anchored, string = anchored to blockchain
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  blockchainAnchorHash: string | null;

  /**
   * Blockchain transaction ID for this event
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
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
   * Timestamp when event was anchored to blockchain
   */
  @Column({ type: 'timestamp', nullable: true })
  blockchainAnchoredAt: Date | null;

  /**
   * Last time blockchain anchor was verified
   */
  @Column({ type: 'timestamp', nullable: true })
  blockchainVerifiedAt: Date | null;

  @OneToMany(() => TicketType, (tt) => tt.event)
  ticketTypes: TicketType[];

  @OneToMany(() => Ticket, (t) => t.event)
  tickets: Ticket[];

  @Index()
  @Column({ type: 'uuid', nullable: true })
  organizerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organizerId' })
  organizer: User | null;
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

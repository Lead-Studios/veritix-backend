import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TicketingEvent } from '../../ticketing/entities/event.entity';

export enum NftTicketStatus {
  PENDING = 'pending',
  MINTING = 'minting',
  MINTED = 'minted',
  FAILED = 'failed',
  TRANSFERRED = 'transferred',
}

export enum NftPlatform {
  POLYGON = 'polygon',
  ZORA = 'zora',
}

export interface TransferHistoryEntry {
  fromAddress: string;
  toAddress: string;
  transactionHash: string;
  timestamp: Date;
}

@Entity('nft_tickets')
@Index(['eventId', 'createdAt'])
@Index(['tokenId', 'contractAddress'])
@Index(['purchaserId', 'createdAt'])
export class NftTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @Column({ type: 'uuid' })
  @Index()
  purchaserId: string;

  @Column({ type: 'varchar', length: 255 })
  purchaserName: string;

  @Column({ type: 'varchar', length: 255 })
  purchaserEmail: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purchaserWalletAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  previousOwnerWalletAddress: string;

  @Column({ type: 'jsonb', nullable: true, default: [] })
  transferHistory: TransferHistoryEntry[];

  @Column({
    type: 'enum',
    enum: NftPlatform,
  })
  platform: NftPlatform;

  @Column({
    type: 'enum',
    enum: NftTicketStatus,
    default: NftTicketStatus.PENDING,
  })
  @Index()
  status: NftTicketStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tokenId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tokenUri: string;

  @Column({ type: 'text', nullable: true })
  metadata: string; // JSON string of NFT metadata

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  blockNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePaid: number;

  @Column({ type: 'timestamp' })
  purchaseDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  mintedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date;

  @ManyToOne(() => TicketingEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: TicketingEvent;

  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TicketingEvent } from '../../ticketing/entities/event.entity';
import { NftPlatform } from './nft-ticket.entity';

export enum NftTicketType {
  QR = 'qr',
  NFT = 'nft',
  HYBRID = 'hybrid', // Both QR and NFT
}

@Entity('nft_minting_configs')
export class NftMintingConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  eventId: string;

  @Column({
    type: 'enum',
    enum: NftTicketType,
    default: NftTicketType.QR,
  })
  ticketType: NftTicketType;

  @Column({
    type: 'enum',
    enum: NftPlatform,
    nullable: true,
  })
  preferredPlatform: NftPlatform;

  @Column({ type: 'boolean', default: false })
  nftEnabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractSymbol: string;

  @Column({ type: 'text', nullable: true })
  baseTokenUri: string;

  @Column({ type: 'text', nullable: true })
  metadataTemplate: string; // JSON template for NFT metadata

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizerWalletAddress: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  royaltyPercentage: string; // e.g., "2.5" for 2.5%

  @Column({ type: 'varchar', length: 255, nullable: true })
  royaltyRecipient: string;

  @Column({ type: 'boolean', default: true })
  allowTransfer: boolean;

  @Column({ type: 'boolean', default: false })
  burnAfterEvent: boolean;

  @Column({ type: 'text', nullable: true })
  customMetadata: string; // JSON string for custom metadata fields

  @Column({ type: 'varchar', length: 255, nullable: true })
  polygonApiKey: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  zoraApiKey: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  zoraNetwork: string; // 'mainnet', 'testnet', etc.

  @Column({ type: 'boolean', default: false })
  autoMint: boolean; // Automatically mint NFT after purchase

  @Column({ type: 'int', default: 3 })
  maxRetries: number;

  @Column({ type: 'int', default: 300000 }) // 5 minutes in milliseconds
  retryDelay: number;

  @OneToOne(() => TicketingEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: TicketingEvent;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

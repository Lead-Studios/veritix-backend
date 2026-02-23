import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BlockchainAnchorType, BlockchainAnchorStatus } from '../../blockchain/enums';

/**
 * BlockchainAnchor Entity
 * Stores blockchain anchoring records for audit and verification
 * Decoupled from specific entity types through entityId and entityType
 */
@Entity()
@Index(['entityId', 'entityType'])
@Index(['anchorHash'])
@Index(['status'])
export class BlockchainAnchor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  entityId: string;

  @Column({
    type: 'enum',
    enum: BlockchainAnchorType,
  })
  entityType: BlockchainAnchorType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  anchorHash: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string | null;

  @Column({
    type: 'enum',
    enum: BlockchainAnchorStatus,
    default: BlockchainAnchorStatus.PENDING,
  })
  status: BlockchainAnchorStatus;

  @Column({ type: 'text', nullable: true })
  anchoredData: string | null;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  verifiedAt?: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TicketStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('tickets')
@Index('idx_ticket_code', ['code'], { unique: true })
@Index('idx_ticket_status', ['status'])
@Index('idx_ticket_expires_at', ['expiresAt'])
export class TicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.ACTIVE })
  status: TicketStatus;

  @Column({ type: 'integer', default: 1 })
  maxUses: number;

  @Column({ type: 'integer', default: 0 })
  usageCount: number;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper method to check if ticket is still valid
   */
  isValid(): boolean {
    return this.status === TicketStatus.ACTIVE && new Date() < this.expiresAt;
  }

  /**
   * Helper method to check if ticket can be used
   */
  canBeUsed(): boolean {
    return this.isValid() && this.usageCount < this.maxUses;
  }
}

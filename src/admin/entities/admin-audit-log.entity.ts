import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum AdminAuditAction {
  ROLE_CHANGE = 'ROLE_CHANGE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_UNSUSPENDED = 'USER_UNSUSPENDED',
  MANUAL_REFUND = 'MANUAL_REFUND',
  TICKET_CANCELLED = 'TICKET_CANCELLED',
}

export enum AdminAuditTargetType {
  USER = 'user',
  EVENT = 'event',
  ORDER = 'order',
  TICKET = 'ticket',
}

@Entity('admin_audit_logs')
@Index(['actorId'])
@Index(['action'])
@Index(['targetType', 'targetId'])
@Index(['performedAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'varchar' })
  actorEmail: string;

  @Column({
    type: 'enum',
    enum: AdminAuditAction,
  })
  action: AdminAuditAction;

  @Column({
    type: 'enum',
    enum: AdminAuditTargetType,
  })
  targetType: AdminAuditTargetType;

  @Column({ type: 'varchar' })
  targetId: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown> | null;

  @CreateDateColumn()
  performedAt: Date;
}

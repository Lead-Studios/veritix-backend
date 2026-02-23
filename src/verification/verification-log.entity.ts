import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VerificationStatus } from './interfaces/verification.interface';

/**
 * Immutable audit record for every ticket scan attempt.
 *
 * One row is written per attempt regardless of outcome. Rows are never
 * updated or deleted — they form an append-only audit trail consumed by
 * the log and stats endpoints (Issues 5 & 6).
 *
 * PII policy: only the raw scanned code, IDs, and outcome are stored.
 * No cardholder data, names, or contact details are persisted here.
 */
@Entity('verification_logs')
@Index('IDX_verification_logs_event_id', ['eventId'])
@Index('IDX_verification_logs_ticket_id', ['ticketId'])
@Index('IDX_verification_logs_event_attempted', ['eventId', 'attemptedAt'])
export class VerificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Foreign key to the ticket record.
   * Nullable — the ticket row may not exist when the code is unrecognised.
   */
  @Column({ type: 'uuid', name: 'ticket_id', nullable: true })
  ticketId: string | null;

  /**
   * The raw barcode / QR value submitted by the scanner.
   * Retained for forensic replay; must not contain sensitive payload data.
   */
  @Column({ type: 'varchar', length: 512, name: 'ticket_code' })
  ticketCode: string;

  /** The event this scan was attempted against. */
  @Column({ type: 'uuid', name: 'event_id' })
  eventId: string;

  /**
   * The staff member or device that performed the scan.
   * Nullable — anonymous / kiosk scans may not carry a verifier identity.
   */
  @Column({ type: 'uuid', name: 'verifier_id', nullable: true })
  verifierId: string | null;

  /** Outcome of the verification attempt. */
  @Column({
    type: 'enum',
    enum: VerificationStatus,
    name: 'status',
  })
  status: VerificationStatus;

  /**
   * Human-readable description of the outcome.
   * Populated by the verification service; safe to surface in admin UIs.
   */
  @Column({ type: 'text', name: 'message' })
  message: string;

  /** Wall-clock time the attempt was recorded (UTC, set by the database). */
  @CreateDateColumn({ name: 'attempted_at', type: 'timestamptz' })
  attemptedAt: Date;
}
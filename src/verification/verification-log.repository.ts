import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationStatus } from './interfaces/verification.interface';

export interface CreateLogDto {
  ticketId: string | null;
  ticketCode: string;
  eventId: string;
  verifierId: string | null;
  status: VerificationStatus;
  message: string;
}

export interface LogQueryOptions {
  /** ISO date string — filter attempts on or after this timestamp. */
  from?: Date;
  /** ISO date string — filter attempts on or before this timestamp. */
  to?: Date;
  /** Restrict to a specific outcome. */
  status?: VerificationStatus;
  /** Max rows to return (default 100, max 500). */
  limit?: number;
  /** Rows to skip for cursor-style pagination. */
  offset?: number;
}

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

@Injectable()
export class VerificationLogRepository {
  constructor(
    @InjectRepository(VerificationLog)
    private readonly repo: Repository<VerificationLog>,
  ) {}

  // ------------------------------------------------------------------
  // Write
  // ------------------------------------------------------------------

  /**
   * Persist a single scan attempt. Called by the verification service
   * after every attempt — success or failure.
   */
  async create(dto: CreateLogDto): Promise<VerificationLog> {
    const log = this.repo.create(dto);
    return this.repo.save(log);
  }

  // ------------------------------------------------------------------
  // Read — used by Issues 5 (stats) and 6 (log endpoints)
  // ------------------------------------------------------------------

  /**
   * Return all scan attempts for a given event, newest first.
   * Supports optional time-range, status, and pagination filters.
   */
  async getLogsForEvent(
    eventId: string,
    options: LogQueryOptions = {},
  ): Promise<{ logs: VerificationLog[]; total: number }> {
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = options.offset ?? 0;

    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.event_id = :eventId', { eventId })
      .orderBy('log.attempted_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options.from) {
      qb.andWhere('log.attempted_at >= :from', { from: options.from });
    }
    if (options.to) {
      qb.andWhere('log.attempted_at <= :to', { to: options.to });
    }
    if (options.status) {
      qb.andWhere('log.status = :status', { status: options.status });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  /**
   * Return all scan attempts for a specific ticket, newest first.
   * Useful for investigating repeated failed scans on a single ticket.
   */
  async getLogsForTicket(
    ticketId: string,
    options: LogQueryOptions = {},
  ): Promise<{ logs: VerificationLog[]; total: number }> {
    const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = options.offset ?? 0;

    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.ticket_id = :ticketId', { ticketId })
      .orderBy('log.attempted_at', 'DESC')
      .take(limit)
      .skip(offset);

    if (options.from) {
      qb.andWhere('log.attempted_at >= :from', { from: options.from });
    }
    if (options.to) {
      qb.andWhere('log.attempted_at <= :to', { to: options.to });
    }
    if (options.status) {
      qb.andWhere('log.status = :status', { status: options.status });
    }

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }

  /**
   * Aggregate attempt counts grouped by status for a given event.
   * Powers the stats endpoint (Issue 5) without loading individual rows.
   */
  async getStatusCountsForEvent(
    eventId: string,
    from?: Date,
    to?: Date,
  ): Promise<Record<VerificationStatus, number>> {
    const qb = this.repo
      .createQueryBuilder('log')
      .select('log.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('log.event_id = :eventId', { eventId })
      .groupBy('log.status');

    if (from) qb.andWhere('log.attempted_at >= :from', { from });
    if (to) qb.andWhere('log.attempted_at <= :to', { to });

    const rows: { status: VerificationStatus; count: string }[] =
      await qb.getRawMany();

    // Seed every status with 0 so callers always get a complete object.
    const counts = Object.values(VerificationStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<VerificationStatus, number>,
    );

    for (const row of rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return counts;
  }
}
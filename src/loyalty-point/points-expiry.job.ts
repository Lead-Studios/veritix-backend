import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoyaltyService } from '../services/loyalty.service';

/**
 * Points Expiry Job
 *
 * Runs on the 1st of every month at 02:00 UTC.
 * Scans all EARN loyalty-transaction rows whose `expiresAt` has passed,
 * debits the corresponding account balances, and writes EXPIRE rows.
 *
 * The job is idempotent — re-running it on an already-expired batch is safe
 * because the `isExpired` flag prevents double-counting.
 */
@Injectable()
export class PointsExpiryJob {
  private readonly logger = new Logger(PointsExpiryJob.name);

  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * Primary monthly schedule: 02:00 on the 1st of each month (UTC).
   *
   * To override in tests or staging set the POINTS_EXPIRY_CRON env var, e.g.:
   *   POINTS_EXPIRY_CRON="0 2 1 * *"
   */
  @Cron(process.env.POINTS_EXPIRY_CRON ?? '0 2 1 * *', {
    name: 'points-expiry',
    timeZone: 'UTC',
  })
  async handleMonthlyExpiry(): Promise<void> {
    this.logger.log('Points expiry job started');

    try {
      const result = await this.loyaltyService.runPointsExpiry();
      this.logger.log(
        `Points expiry job complete — expired rows: ${result.expiredRows}, ` +
        `accounts affected: ${result.accountsAffected}`,
      );
    } catch (err) {
      this.logger.error('Points expiry job failed', (err as Error).stack);
      // Re-throw so NestJS scheduler can mark the job as failed and alert
      throw err;
    }
  }

  /**
   * Allows manual trigger (e.g. admin endpoint / migration script).
   * Returns the result so callers can report what happened.
   */
  async triggerManually(): Promise<{ expiredRows: number; accountsAffected: number }> {
    this.logger.warn('Points expiry job triggered manually');
    return this.loyaltyService.runPointsExpiry();
  }
}

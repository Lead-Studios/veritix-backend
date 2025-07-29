import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from '../entities/waitlist-entry.entity';
import { NotificationService } from 'src/notification/services/notification.service';

@Processor('waitlist-notifications')
@Injectable()
export class WaitlistNotificationProcessor {
  constructor(
    @InjectRepository(WaitlistEntry)
    private waitlistRepository: Repository<WaitlistEntry>,
    private notificationService: NotificationService,
  ) {}

  @Process('notify-waitlist-users')
  async handleNotifyWaitlistUsers(
    job: Job<{ eventId: string; userIds: string[]; availableTickets: number }>,
  ) {
    const { eventId, userIds } = job.data;

    // Process notifications in batches to avoid overwhelming the notification service
    const batchSize = 10;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      // Send notifications concurrently within the batch
      await Promise.all(
        batch.map(async (userId) => {
          try {
            await this.notificationService.sendTicketAvailableNotification(
              userId,
              eventId,
            );

            // Mark as notified
            await this.waitlistRepository.update(
              { userId, eventId },
              { notified: true },
            );
          } catch (error) {
            console.error(`Failed to notify user ${userId}:`, error);
            // You might want to implement retry logic here
          }
        }),
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }
}

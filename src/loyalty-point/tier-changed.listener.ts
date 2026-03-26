import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TierChangedEvent } from '../services/loyalty.service';

/**
 * Handles tier-change domain events emitted by LoyaltyService.
 *
 * Replace the logger stubs below with your existing NotificationsService
 * (push, email, in-app) once you wire it in.
 */
@Injectable()
export class TierChangedListener {
  private readonly logger = new Logger(TierChangedListener.name);

  @OnEvent('loyalty.tier.changed', { async: true })
  async handle(event: TierChangedEvent): Promise<void> {
    if (event.isUpgrade) {
      await this.sendUpgradeNotification(event);
    } else {
      await this.sendDowngradeNotification(event);
    }
  }

  private async sendUpgradeNotification(event: TierChangedEvent): Promise<void> {
    this.logger.log(
      `🏆 Tier UPGRADE — userId=${event.userId} ` +
      `${event.previousTier} → ${event.newTier}`,
    );
    // TODO: inject NotificationsService and call:
    //   await this.notificationsService.send(event.userId, {
    //     title: `You've reached ${event.newTier}!`,
    //     body:  `Congrats! Enjoy better earn rates and exclusive rewards.`,
    //     type:  NotificationType.LOYALTY_TIER_UPGRADE,
    //     data:  { previousTier: event.previousTier, newTier: event.newTier },
    //   });
  }

  private async sendDowngradeNotification(event: TierChangedEvent): Promise<void> {
    this.logger.warn(
      `⬇️  Tier DOWNGRADE — userId=${event.userId} ` +
      `${event.previousTier} → ${event.newTier}`,
    );
    // TODO: inject NotificationsService and call:
    //   await this.notificationsService.send(event.userId, {
    //     title: `Your tier has changed to ${event.newTier}`,
    //     body:  `Keep transacting to regain your previous tier.`,
    //     type:  NotificationType.LOYALTY_TIER_DOWNGRADE,
    //     data:  { previousTier: event.previousTier, newTier: event.newTier },
    //   });
  }
}

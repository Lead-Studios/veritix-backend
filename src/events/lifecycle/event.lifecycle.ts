import { BadRequestException } from '@nestjs/common';
import { EventStatus } from '../../common/enums/event-status.enum';
import { EVENT_STATUS_TRANSITIONS } from './event.transitions';
import { validateForPublish } from './event.validators';
import { Event } from '../entities/event.entity';

export function applyEventStatusChange(
  event: Event,
  nextStatus: EventStatus,
  metadata?: {
    cancellationReason?: string;
    newStartDate?: Date;
    newEndDate?: Date;
  },
) {
  const allowed = EVENT_STATUS_TRANSITIONS[event.status];
  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Invalid transition from ${event.status} to ${nextStatus}`,
    );
  }

  if (nextStatus === EventStatus.PUBLISHED) {
    validateForPublish(event);
  }

  if (
    nextStatus === EventStatus.CANCELLED &&
    !metadata?.cancellationReason
  ) {
    throw new BadRequestException(
      'Cancellation reason is required',
    );
  }

  if (nextStatus === EventStatus.POSTPONED) {
    if (!metadata?.newStartDate || !metadata?.newEndDate) {
      throw new BadRequestException(
        'New dates are required for postponement',
      );
    }

    event.eventDate = metadata.newStartDate;
    event.eventClosingDate = metadata.newEndDate;
  }

  event.status = nextStatus;
}

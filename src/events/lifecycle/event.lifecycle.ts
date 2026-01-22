import { Event } from '../entities/event.entity';
import { EventStatus } from '../../enums/event-status.enum';
import { BadRequestException } from '@nestjs/common';
import { EVENT_STATUS_TRANSITIONS } from './event.transitions';
import { validatePublish } from './event.validators';

export function applyEventStatusChange(event: Event, nextStatus: EventStatus) {
  const allowed = EVENT_STATUS_TRANSITIONS[event.status];

  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Cannot change event from ${event.status} to ${nextStatus}`,
    );
  }

  if (nextStatus === EventStatus.PUBLISHED) {
    validatePublish(event);
  }

  event.status = nextStatus;
}

import { EventStatus } from '../../enums/event-status.enum';

export const EVENT_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.PUBLISHED]: [EventStatus.CANCELLED, EventStatus.POSTPONED, EventStatus.COMPLETED],
  [EventStatus.POSTPONED]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.COMPLETED]: [],
  [EventStatus.CANCELLED]: [],
};

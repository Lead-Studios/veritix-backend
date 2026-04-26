import { EventStatus } from './enums/event-status.enum';

export const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.PUBLISHED]: [
    EventStatus.CANCELLED,
    EventStatus.POSTPONED,
    EventStatus.COMPLETED,
  ],
  [EventStatus.POSTPONED]: [EventStatus.PUBLISHED, EventStatus.CANCELLED],
  [EventStatus.CANCELLED]: [],
  [EventStatus.COMPLETED]: [],
};

export function isValidTransition(from: EventStatus, to: EventStatus): boolean {
  return EVENT_TRANSITIONS[from]?.includes(to) ?? false;
}

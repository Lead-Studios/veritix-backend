import { BadRequestException } from '@nestjs/common';
import { Event } from '../entities/event.entity';

export function validatePublish(event: Event) {
  if (event.capacity <= 0) {
    throw new BadRequestException('Event capacity must be greater than 0');
  }

  if (event.eventDate >= event.eventClosingDate) {
    throw new BadRequestException('Event start date must be before end date');
  }

  if (event.eventDate < new Date()) {
    throw new BadRequestException('Cannot publish an event in the past');
  }
}

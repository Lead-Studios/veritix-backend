import { ApiProperty } from '@nestjs/swagger';

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published', 
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}

export class EventStatusDto {
  @ApiProperty({
    enum: EventStatus,
    description: 'Status of the event',
    example: EventStatus.PUBLISHED
  })
  status: EventStatus;
}


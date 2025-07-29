import { IsUUID } from 'class-validator';

export class ArchiveEventDto {
  @IsUUID()
  eventId: string;
} 
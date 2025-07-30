import { IsUUID } from 'class-validator';

export class DeleteEventDto {
  @IsUUID()
  eventId: string;
}
